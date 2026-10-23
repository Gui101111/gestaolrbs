// Isolated regression tests. All provider and media requests are mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const app = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(process.env.TEST_WORK_ROOT || os.tmpdir(), 'hf-worker-'));
const cache = new Map();
function loadTS(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, m);
  const baseRequire = m.require.bind(m);
  m.require = id => {
    if (id.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), id + '.ts');
      if (fs.existsSync(target)) return loadTS(target);
    }
    return baseRequire(id);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return m.exports;
}
process.chdir(scratch);
let tick;
global.setInterval = callback => { tick = callback; return { unref() {} }; };
const db = loadTS(path.join(app, 'lib/db.ts'));
const worker = loadTS(path.join(app, 'lib/worker.ts'));
db.setSetting('hf_key_id', 'test-id');
db.setSetting('hf_key_secret', 'test-secret');
worker.ensureWorker();
let fetchImpl;
let posts;
global.fetch = async (url, options = {}) => {
  if (options.method === 'POST') posts++;
  assert.ok(options.signal, 'Network requests must have a timeout');
  if (String(url).startsWith('https://media.test/')) {
    assert.equal(options.headers?.Authorization, undefined, 'Do not send API credentials to media storage');
  }
  return fetchImpl(String(url), options);
};
const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const media = () => new Response(Buffer.from('0000ftyp-test-media'), { headers: { 'Content-Type': 'video/mp4' } });
function job(status = 'in_progress', age = 1000) {
  db.db().exec('DELETE FROM generations; DELETE FROM jobs;');
  posts = 0;
  const id = randomUUID();
  db.insertJob({ id, model_id: 'test', model_name: 'Test', endpoint: '/test', kind: 'video', prompt: 'Test', params: {}, batch: 1, est_usd: null, est_credits: null });
  db.updateJob(id, { status, request_id: 'existing-request', submitted_at: Date.now() - age, next_poll_at: 0 });
  return id;
}
async function runTick() {
  await tick();
  for (let n = 0; n < 1000 && global.__hfWorker.busy.size; n++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(global.__hfWorker.busy.size, 0, 'Worker did not settle');
}
async function main() {
  let id = job();
  fetchImpl = async () => { throw new TypeError('fetch failed', { cause: { code: 'EACCES' } }); };
  await runTick();
  assert.equal(db.getJob(id).status, 'in_progress');
  assert.match(db.getJob(id).error, /bloqueado/);
  assert.equal(posts, 0);
  db.updateJob(id, { next_poll_at: 0 });
  fetchImpl = async () => json({ status: 'in_progress' });
  await runTick();
  assert.equal(db.getJob(id).error, null);
  console.log('PASS: blocked connection is visible; successful polling clears it');

  id = job('in_progress', 60 * 60 * 1000);
  fetchImpl = async url => url.includes('/status') ? json({ status: 'completed', video: { url: 'https://media.test/old.mp4' } }) : media();
  await runTick();
  assert.equal(db.getJob(id).status, 'completed');
  assert.equal(db.getJob(id).outputs.length, 1);
  assert.equal(posts, 0);
  console.log('PASS: an old completed request is recovered instead of timing out');

  id = job();
  let mediaCalls = 0;
  fetchImpl = async url => {
    if (url.includes('/status')) return json({ status: 'completed', video: { url: 'https://media.test/retry.mp4' } });
    if (++mediaCalls === 1) throw new TypeError('fetch failed');
    return media();
  };
  await runTick();
  assert.equal(db.getJob(id).status, 'downloading');
  assert.match(db.getJob(id).error, /Resultado pronto/);
  assert.ok(db.getJob(id).next_poll_at > Date.now());
  await runTick();
  assert.equal(mediaCalls, 1, 'Backoff must be respected');
  db.updateJob(id, { next_poll_at: 0 });
  await runTick();
  assert.equal(db.getJob(id).status, 'completed');
  assert.equal(db.getJob(id).error, null);
  assert.equal(db.getJob(id).outputs.length, 1);
  assert.equal(posts, 0);
  console.log('PASS: interrupted download retries without submitting a new generation');

  id = job();
  let firstDownloads = 0;
  let secondDownloads = 0;
  fetchImpl = async url => {
    if (url.includes('/status')) return json({ status: 'completed', images: [{ url: 'https://media.test/one.mp4' }, { url: 'https://media.test/two.mp4' }] });
    if (url.endsWith('one.mp4')) { firstDownloads++; return media(); }
    if (++secondDownloads === 1) throw new TypeError('fetch failed');
    return media();
  };
  await runTick();
  assert.equal(db.getJob(id).outputs.length, 1);
  db.updateJob(id, { next_poll_at: 0 });
  await runTick();
  assert.equal(db.getJob(id).status, 'completed');
  assert.equal(db.getJob(id).outputs.length, 2);
  assert.equal(firstDownloads, 1);
  assert.equal(posts, 0);
  console.log('PASS: partial results are preserved across retries');

  id = job('pending');
  fetchImpl = async () => { throw new TypeError('fetch failed'); };
  await runTick();
  await runTick();
  assert.equal(posts, 1, 'Never repeat an ambiguous paid submission');
  assert.equal(db.getJob(id).status, 'failed');
  console.log('PASS: ambiguous generation submission is never retried automatically');
  db.db().close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
