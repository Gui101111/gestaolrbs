/**
 * Worker de edição próprio (VIDEO_EDITING_PROVIDER=external).
 *
 * Roda o mesmo editor de referência do agente (sandbox/tribuna_editor.py) num
 * servidor seu, sem depender da API da Anthropic: baixa o original pela URL
 * assinada, analisa (silêncios, rosto, transcrição com faster-whisper se
 * instalado), aplica o plano automático, renderiza cada formato, sobe para o
 * bucket rendered-videos e reporta o progresso em POST /api/jobs/callback.
 *
 * Execução:  npm run worker   (porta 8787)
 * Requisitos: ffmpeg e python3 no PATH (opcional: pip install faster-whisper "opencv-python-headless<5"),
 *             NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, JOBS_CALLBACK_SECRET, EDITING_WORKER_TOKEN.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { EditBrief, JobCallback } from "../services/editing/types";

const PORT = Number(process.env.WORKER_PORT ?? 8787);
const TOKEN = process.env.EDITING_WORKER_TOKEN ?? "";
const ROOT = process.cwd();
const EDITOR = path.join(ROOT, "sandbox", "tribuna_editor.py");
const ASSETS = path.join(ROOT, "supabase", "assets");
const TOM: Record<string, string> = { institucional: "sobria", cinematografico: "inspiradora" };

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
  auth: { persistSession: false },
});

async function callback(brief: EditBrief, payload: Omit<JobCallback, "jobId">) {
  await fetch(brief.job.callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.JOBS_CALLBACK_SECRET}` },
    body: JSON.stringify({ jobId: brief.job.id, ...payload }),
  }).catch((e) => console.error("[worker] callback falhou", e));
}

const STEPS: [RegExp, JobCallback["step"]][] = [
  [/baixando|medindo|extraindo/, "analyzing_audio"],
  [/transcrevendo/, "transcribing"],
  [/rastreando/, "analyzing_content"],
  [/planejando/, "planning"],
  [/renderizando/, "rendering"],
];

function run(args: string[], onStep: (step: JobCallback["step"]) => void) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn("python3", [EDITOR, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    const read = (d: Buffer) => {
      const text = d.toString();
      tail = (tail + text).slice(-4000);
      for (const m of text.matchAll(/ETAPA: ([^\n]+)/g)) {
        const hit = STEPS.find(([rx]) => rx.test(m[1]));
        if (hit) onStep(hit[1]);
      }
    };
    p.stdout.on("data", read);
    p.stderr.on("data", read);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(tail.split("\n").filter(Boolean).pop() ?? `editor saiu com ${code}`))));
  });
}

/** EditBrief da plataforma → brief do editor (arquivos de fonte e trilha deste servidor). */
function toSandboxBrief(brief: EditBrief) {
  const p = brief.project;
  const options = (p.options ?? {}) as { answers?: Record<string, string>; answers_text?: Record<string, string> };
  const font = brief.brand?.font?.replace(/\s+/g, "");
  const fonts = font ? [`fonts/${font}-Regular.ttf`, `fonts/${font}-Bold.ttf`].map((f) => path.join(ASSETS, f)).filter(existsSync) : [];
  const toneDir = path.join(ASSETS, "music", TOM[p.editingStyle ?? ""] ?? "neutra");
  const track = existsSync(toneDir) ? readdirSync(toneDir).find((f) => /\.(m4a|mp3|wav|aac)$/.test(f)) : undefined;
  const original = brief.sources.find((s) => s.kind === "original") ?? brief.sources[0];
  return {
    versao: 1,
    tipo: p.revisionNotes.length ? "ajuste" : "novo",
    projeto: {
      id: p.id,
      nome: p.name,
      estilo: p.editingStyle,
      area: p.legalArea,
      objetivo: p.objective,
      formatos: p.aspectRatios,
      plataformas: p.platforms,
      respostas: options.answers ?? {},
      respostas_texto: options.answers_text ?? {},
      observacoes: p.instructions,
      revisao_oab: brief.compliance.oabProvimento205,
    },
    advogado: { nome: brief.lawyer.name, oab: brief.lawyer.oab, escritorio: brief.lawyer.officeName },
    marca: brief.brand
      ? {
          nome_profissional: brief.brand.professionalName,
          oab: brief.brand.oabDisplay ?? brief.lawyer.oab,
          escritorio: brief.brand.officeName ?? brief.lawyer.officeName,
          fonte: brief.brand.font,
          cores: { principal: brief.brand.colors.primary, fundo: brief.brand.colors.secondary, texto: brief.brand.colors.accent },
          site: brief.brand.website,
          instagram: brief.brand.instagram,
          whatsapp: brief.brand.whatsapp,
        }
      : null,
    ajustes: p.revisionNotes.map((r) => ({ comentario: r.comment, tempo_s: r.timestampSec })),
    urls: {
      original: original?.url,
      logo: brief.brand?.logoUrl ?? null,
      fontes: fonts.map((f) => `file://${f}`),
      musica: track ? `file://${path.join(toneDir, track)}` : null,
      upload: {},
    },
  };
}

export async function processBrief(brief: EditBrief) {
  const dir = await mkdtemp(path.join(tmpdir(), "tribuna-"));
  try {
    const sb = toSandboxBrief(brief);
    if (!sb.urls.original) throw new Error("missing_source");
    await writeFile(path.join(dir, "brief.json"), JSON.stringify(sb));
    await callback(brief, { status: "running", step: "analyzing_audio" });
    let last: JobCallback["step"] = "analyzing_audio";
    const onStep = (step: JobCallback["step"]) => {
      if (step === last) return;
      last = step;
      void callback(brief, { step });
    };
    await run(["tudo", "--brief", path.join(dir, "brief.json"), "--work", dir, "--sem-envio"], onStep);

    const report = JSON.parse(await readFile(path.join(dir, "saida", "report.json"), "utf8")) as {
      formatos: { formato: string; arquivo: string; miniatura: string; duracao_s: number; largura: number; altura: number }[];
    };
    const plan = JSON.parse(await readFile(path.join(dir, "plano.json"), "utf8")) as unknown;
    const prefix = `${brief.outputs[0]?.destination.prefix ?? `${brief.project.id}/`}w${Date.now()}`;
    const outputs: NonNullable<JobCallback["outputs"]> = [];
    for (const f of report.formatos) {
      const video = path.join(dir, "saida", f.arquivo);
      const thumb = path.join(dir, "saida", f.miniatura);
      const videoPath = `${prefix}/${f.arquivo}`;
      const thumbPath = `${prefix}/${f.miniatura}`;
      const up = await supabase.storage.from("rendered-videos").upload(videoPath, await readFile(video), { contentType: "video/mp4", upsert: true });
      if (up.error) throw new Error(`upload_failed: ${up.error.message}`);
      await supabase.storage.from("rendered-videos").upload(thumbPath, await readFile(thumb), { contentType: "image/jpeg", upsert: true });
      outputs.push({
        aspectRatio: f.formato as "9:16",
        bucket: "rendered-videos",
        path: videoPath,
        fileName: f.arquivo,
        width: f.largura,
        height: f.altura,
        durationSec: f.duracao_s,
        sizeBytes: (await stat(video)).size,
        thumbnailPath: thumbPath,
      });
    }
    await callback(brief, { step: "rendering", progress: 95, outputs, editPlan: plan });
    await callback(brief, { status: "succeeded", step: "completed", progress: 100 });
  } catch (e) {
    console.error("[worker] falha", e);
    await callback(brief, { status: "failed", error: { code: "worker_error", message: "Falha no processamento automático." } });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function authorized(header: string | undefined) {
  const a = Buffer.from(`Bearer ${TOKEN}`);
  const b = Buffer.from(header ?? "");
  return TOKEN.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

if (process.argv[1]?.includes("editing-worker")) {
  http
    .createServer(async (req, res) => {
      if (req.method !== "POST" || !authorized(req.headers.authorization)) {
        res.writeHead(401).end();
        return;
      }
      let body = "";
      for await (const chunk of req) body += chunk;
      const brief = JSON.parse(body) as EditBrief;
      res.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify({ id: brief.job.id }));
      void processBrief(brief);
    })
    .listen(PORT, () => console.log(`[worker] ouvindo em :${PORT}`));
}
