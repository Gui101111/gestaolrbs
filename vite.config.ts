import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Em desenvolvimento (`npm run dev`) o Vite não executa as funções da pasta /api
 * como a Vercel faz. Este plugin carrega o arquivo /api/<nome>.ts e chama o
 * handler exportado com o mesmo nome do método HTTP (POST, GET...).
 */
function devApi(): Plugin {
  return {
    name: 'tribuna-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();
        const name = url.slice(5).split('?')[0];
        if (!/^[a-z-]+$/.test(name)) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
          }
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(`http://localhost${url}`, {
            method: req.method,
            headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          console.error(error);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Erro interno no servidor de desenvolvimento.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Disponibiliza as chaves do .env para as funções /api durante o desenvolvimento.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return {
    plugins: [react(), tailwindcss(), devApi()],
    // O codificador AAC em WASM é grande, mas só carrega quando o navegador não tem AAC nativo.
    build: { chunkSizeWarningLimit: 1100 },
    // Evita que o servidor de desenvolvimento recarregue a página no meio da primeira edição.
    optimizeDeps: { include: ['mediabunny', '@mediabunny/aac-encoder'] },
  };
});
