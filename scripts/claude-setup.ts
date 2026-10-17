/**
 * Cria (uma vez) o ambiente e o agente do Claude Managed Agents e envia o editor
 * de referência pela Files API. Imprime as variáveis para o .env.local e a Vercel.
 *
 *   npm run claude:setup                 cria ambiente + agente + toolkit
 *   npm run claude:setup -- --atualizar  publica nova versão do agente (guia/modelo) e reenvia o toolkit
 *   npm run claude:setup -- --checar     confere se os IDs do .env existem
 *
 * Requer ANTHROPIC_API_KEY (do workspace "tribuna") e NEXT_PUBLIC_SUPABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { GUIA_DE_EDICAO } from "../lib/claude/guia-edicao";

const args = new Set(process.argv.slice(2));
const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";

const TOOLS = [
  {
    type: "agent_toolset_20260401" as const,
    // Execução sem ninguém olhando: always_allow evita pausas por aprovação.
    // A sandbox só alcança o Supabase, o Hugging Face e os registros de pacotes.
    default_config: { enabled: true, permission_policy: { type: "always_allow" as const } },
    configs: [
      { name: "web_fetch" as const, enabled: false },
      { name: "web_search" as const, enabled: false },
    ],
  },
];

async function uploadToolkit() {
  const file = path.join(process.cwd(), "sandbox", "tribuna_editor.py");
  const uploaded = await client.beta.files.upload({ file: await toFile(fs.createReadStream(file), "tribuna_editor.py", { type: "text/x-python" }) });
  return uploaded.id;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Defina ANTHROPIC_API_KEY (chave do workspace tribuna) no .env.local");

  if (args.has("--checar")) {
    const agent = await client.beta.agents.retrieve(process.env.CLAUDE_AGENT_ID ?? "");
    const env = await client.beta.environments.retrieve(process.env.CLAUDE_ENVIRONMENT_ID ?? "");
    console.log(`Agente: ${agent.name} (versão ${agent.version}, modelo ${JSON.stringify(agent.model)})`);
    console.log(`Ambiente: ${env.name}`);
    if (process.env.CLAUDE_TOOLKIT_FILE_ID) {
      const f = await client.beta.files.retrieveMetadata(process.env.CLAUDE_TOOLKIT_FILE_ID);
      console.log(`Toolkit: ${f.filename} (${f.size_bytes} bytes)`);
    }
    return;
  }

  if (args.has("--atualizar")) {
    const id = process.env.CLAUDE_AGENT_ID;
    if (!id) throw new Error("CLAUDE_AGENT_ID ausente");
    const agent = await client.beta.agents.update(id, { system: GUIA_DE_EDICAO, model: MODEL, tools: TOOLS });
    const toolkit = await uploadToolkit();
    console.log(`Agente atualizado para a versão ${agent.version}.`);
    console.log("\nAtualize no .env.local e na Vercel:");
    console.log(`CLAUDE_TOOLKIT_FILE_ID=${toolkit}`);
    return;
  }

  const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  if (!supabaseHost || supabaseHost.startsWith("127.") || supabaseHost.startsWith("localhost")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL precisa ser o Supabase de produção (a sandbox não alcança o seu computador)");
  }

  const environment = await client.beta.environments.create({
    name: "tribuna-editor",
    config: {
      type: "cloud",
      packages: { pip: ["faster-whisper", "opencv-python-headless<5", "numpy"] },
      networking: {
        type: "limited",
        allow_package_managers: true,
        allowed_hosts: [supabaseHost, "huggingface.co", "*.huggingface.co", "*.hf.co"],
      },
    },
  });

  const agent = await client.beta.agents.create({
    name: "TRIBUNA Editor",
    description: "Edita vídeos de advogados para redes sociais (TRIBUNA).",
    model: MODEL,
    system: GUIA_DE_EDICAO,
    tools: TOOLS,
  });

  const toolkit = await uploadToolkit();

  console.log("Pronto. Copie para o .env.local e para as variáveis da Vercel:\n");
  console.log(`CLAUDE_ENVIRONMENT_ID=${environment.id}`);
  console.log(`CLAUDE_AGENT_ID=${agent.id}`);
  console.log(`CLAUDE_TOOLKIT_FILE_ID=${toolkit}`);
  console.log(`\nAcompanhe as sessões em https://platform.claude.com (workspace tribuna → Sessions).`);
}

main().catch((e) => {
  console.error("Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
