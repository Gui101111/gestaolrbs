import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { BadRequest, parseGenerationRequest } from "@/lib/payload";
import { insertJob, spendSince, getSetting } from "@/lib/db";
import { estimate, hasCredentials, isMetered } from "@/lib/higgsfield";
import { ensureWorker } from "@/lib/worker";

export const runtime = "nodejs";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    if (!hasCredentials()) {
      return NextResponse.json(
        { error: "Chave de API do Higgsfield não configurada. Adicione-a em Configurações." },
        { status: 401 },
      );
    }

    const { model, endpoint, body, prompt, batch } = parseGenerationRequest(await req.json());

    // Price the job before committing to it, so the cost recorded against the
    // job is the real quote rather than whatever the UI last displayed.
    let usd: number | null = null;
    let credits: number | null = null;
    try {
      const q = await estimate(endpoint, body);
      if (!isMetered(q)) {
        // Token-metered models have no up-front figure; leave the cost null so
        // spend tracking simply doesn't count them rather than recording NaN.
        usd = Number.isFinite(Number(q.usd)) ? Number(q.usd) : null;
        credits = Number.isFinite(Number(q.credits)) ? Number(q.credits) : null;
      }
    } catch {
      // Estimation is best-effort; never block a generation on it.
    }

    const cap = Number(getSetting("spend_cap") ?? "");
    if (Number.isFinite(cap) && cap > 0) {
      const spent = spendSince(Date.now() - MONTH_MS).usd;
      if (spent + (usd ?? 0) > cap) {
        return NextResponse.json(
          {
            error: `Limite de gastos atingido: US$ ${spent.toFixed(2).replace(".", ",")} de US$ ${cap.toFixed(2).replace(".", ",")} usados nos últimos 30 dias. Aumente ou remova o limite em Configurações.`,
          },
          { status: 402 },
        );
      }
    }

    const id = randomUUID();
    insertJob({
      id,
      model_id: model.id,
      model_name: model.name,
      endpoint,
      kind: model.kind,
      prompt,
      params: body,
      batch,
      est_usd: usd,
      est_credits: credits,
    });

    // The worker picks it up on the next tick, honouring the concurrency cap.
    ensureWorker();

    return NextResponse.json({ id, estUsd: usd });
  } catch (err) {
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Não foi possível iniciar a geração." }, { status: 500 });
  }
}
