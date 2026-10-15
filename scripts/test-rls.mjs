/**
 * Testes de segurança (RLS, Storage e RPCs) contra um Supabase local.
 * Uso: npx supabase start && npm run test:rls
 * Cria dois usuários temporários, verifica o isolamento e remove tudo ao final.
 */
import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!PUB || !SECRET) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY (ex.: node --env-file=.env.local).");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error("Por segurança, este teste só roda contra um Supabase local.");
  process.exit(1);
}
const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { if (ok) pass++; else fail++; console.log(`${ok ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); };

async function makeUser(tag) {
  const email = `rls.${tag}.${Date.now()}@teste.com.br`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: "Senha1234forte", email_confirm: true, user_metadata: { full_name: `Usuário ${tag}` } });
  if (error) throw error;
  const c = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: "Senha1234forte" });
  if (e2) throw e2;
  return { id: data.user.id, c };
}
const A = await makeUser("a");
const B = await makeUser("b");
const anon = createClient(URL, PUB, { auth: { persistSession: false } });

// Projetos
const { data: pA, error: eA } = await A.c.from("projects").insert({ user_id: A.id, name: "Projeto A" }).select().single();
check("A cria rascunho próprio", !eA && pA);
const { error: eFake } = await B.c.from("projects").insert({ user_id: A.id, name: "Forjado" });
check("B não cria projeto em nome de A", Boolean(eFake));
const { error: eStatusIns } = await A.c.from("projects").insert({ user_id: A.id, name: "Já pronto", status: "ready" });
check("A não cria projeto já 'ready'", Boolean(eStatusIns));
const { data: bSees } = await B.c.from("projects").select("id").eq("id", pA.id);
check("B não lê projeto de A", bSees.length === 0);
const { data: bUpd } = await B.c.from("projects").update({ name: "hack" }).eq("id", pA.id).select();
check("B não altera projeto de A", (bUpd ?? []).length === 0);
const { data: bDel } = await B.c.from("projects").delete().eq("id", pA.id).select();
check("B não exclui projeto de A", (bDel ?? []).length === 0);
const { error: eSt } = await A.c.from("projects").update({ status: "ready" }).eq("id", pA.id);
check("A não altera o próprio status diretamente", Boolean(eSt), eSt?.message);
const { data: anonP } = await anon.from("projects").select("id");
check("Anônimo não lê projetos", (anonP ?? []).length === 0);

// Perfis
const { error: eRole } = await A.c.from("profiles").update({ role: "admin" }).eq("id", A.id);
check("A não se promove a admin", Boolean(eRole), eRole?.message);
const { data: bProf } = await B.c.from("profiles").select("id").eq("id", A.id);
check("B não lê perfil de A", bProf.length === 0);
const { data: aProf } = await A.c.from("profiles").update({ office_name: "Escritório A" }).eq("id", A.id).select("office_name").single();
check("A atualiza campo permitido do próprio perfil", aProf?.office_name === "Escritório A");

// Assinaturas e planos
const { data: aSub } = await A.c.from("subscriptions").select("status").eq("user_id", A.id).single();
check("Novo usuário recebe avaliação (trialing)", aSub?.status === "trialing");
const { data: bSub } = await B.c.from("subscriptions").select("id").eq("user_id", A.id);
check("B não lê assinatura de A", bSub.length === 0);
const { data: subUpd } = await A.c.from("subscriptions").update({ status: "active" }).eq("user_id", A.id).select();
check("A não altera a própria assinatura", (subUpd ?? []).length === 0);
const { data: anonPlans } = await anon.from("plans").select("slug");
check("Anônimo vê só planos públicos ativos", anonPlans.length === 3 && !anonPlans.some((p) => p.slug === "avaliacao"), anonPlans.map((p) => p.slug).join(","));
const { data: aPlans } = await A.c.from("plans").select("slug");
check("A vê o plano de avaliação que assina", aPlans.some((p) => p.slug === "avaliacao"));
const { error: ePlan } = await A.c.from("plans").update({ price_cents: 1 }).eq("slug", "inicial").select();
const { data: planAfter } = await admin.from("plans").select("price_cents").eq("slug", "inicial").single();
check("A não altera preços", planAfter.price_cents === null, ePlan?.message ?? "");

// Jobs, renders, notas, notificações
const { error: eJob } = await A.c.from("render_jobs").insert({ project_id: pA.id, user_id: A.id });
check("A não cria render_job diretamente", Boolean(eJob));
const { error: eRender } = await A.c.from("renders").insert({ project_id: pA.id, user_id: A.id, aspect_ratio: "9:16", storage_path: `${A.id}/${pA.id}/x.mp4` });
check("A não registra render (entrega) diretamente", Boolean(eRender));
const { error: eNote } = await A.c.from("project_notes").insert({ project_id: pA.id, body: "x" });
check("A não escreve notas internas", Boolean(eNote));
await admin.from("notifications").insert({ user_id: A.id, type: "t", title: "Só para A" });
const { data: bNotif } = await B.c.from("notifications").select("id").eq("user_id", A.id);
check("B não lê notificações de A", bNotif.length === 0);

// Lista de espera
const { error: eWait } = await anon.from("waitlist").insert({ email: `w${Date.now()}@x.com` });
check("Anônimo entra na lista de espera", !eWait, eWait?.message);
const { data: wRead } = await anon.from("waitlist").select("email");
check("Anônimo não lê a lista de espera", (wRead ?? []).length === 0);

// Storage
const blob = new Blob([new Uint8Array(16)], { type: "video/mp4" });
const aPath = `${A.id}/${pA.id}/teste.mp4`;
const upA = await A.c.storage.from("original-videos").upload(aPath, blob);
check("A envia original na própria pasta", !upA.error, upA.error?.message);
const upB = await B.c.storage.from("original-videos").upload(`${A.id}/${pA.id}/intruso.mp4`, blob);
check("B não envia na pasta de A", Boolean(upB.error));
const dlB = await B.c.storage.from("original-videos").download(aPath);
check("B não baixa arquivo de A", Boolean(dlB.error));
const sgB = await B.c.storage.from("original-videos").createSignedUrl(aPath, 60);
check("B não gera URL assinada de arquivo de A", Boolean(sgB.error));
const upR = await A.c.storage.from("rendered-videos").upload(`${A.id}/${pA.id}/final.mp4`, blob);
check("A não envia no bucket de entregas", Boolean(upR.error));
const anonList = await anon.storage.from("original-videos").list(A.id);
check("Anônimo não lista arquivos", (anonList.data ?? []).length === 0);
const badMime = await A.c.storage.from("original-videos").upload(`${A.id}/${pA.id}/x.exe`, new Blob(["x"], { type: "application/x-msdownload" }));
check("Bucket rejeita tipo de arquivo inválido", Boolean(badMime.error));

// RPCs e fluxo de envio
const { error: eSubB } = await B.c.rpc("submit_project", { p_project_id: pA.id });
check("B não envia projeto de A", Boolean(eSubB), eSubB?.message);
const { error: eInc } = await A.c.rpc("submit_project", { p_project_id: pA.id });
check("Envio incompleto é bloqueado", eInc?.message === "project_incomplete", eInc?.message);
await A.c.from("projects").update({ objective: "educacional", legal_area: "previdenciario", editing_style: "institucional", platforms: ["instagram_reels"], aspect_ratios: ["9:16"], source_duration_sec: 60 }).eq("id", pA.id);
const { error: eRights } = await A.c.rpc("submit_project", { p_project_id: pA.id });
check("Exige declaração de direito de uso", eRights?.message === "rights_not_confirmed", eRights?.message);
await A.c.from("projects").update({ rights_confirmed_at: new Date().toISOString() }).eq("id", pA.id);
const { error: eVid } = await A.c.rpc("submit_project", { p_project_id: pA.id });
check("Exige vídeo enviado", eVid?.message === "missing_video", eVid?.message);
const { error: eFileB } = await B.c.from("project_files").insert({ project_id: pA.id, user_id: B.id, storage_path: aPath, file_name: "x.mp4", status: "uploaded" });
check("B não anexa arquivo ao projeto de A", Boolean(eFileB));
await A.c.from("project_files").insert({ project_id: pA.id, user_id: A.id, storage_path: aPath, file_name: "teste.mp4", status: "uploaded" });
const { data: job, error: eOk } = await A.c.rpc("submit_project", { p_project_id: pA.id });
check("Envio válido cria o job", !eOk && job?.status === "queued", eOk?.message);
const { error: eLock } = await A.c.from("projects").update({ editing_style: "performance" }).eq("id", pA.id);
check("Projeto enviado fica bloqueado para edição", eLock?.message === "project_locked", eLock?.message);
const { data: renamed } = await A.c.from("projects").update({ name: "Renomeado" }).eq("id", pA.id).select("name").single();
check("Renomear projeto enviado continua permitido", renamed?.name === "Renomeado");
const { data: usage } = await A.c.rpc("get_my_usage");
check("Cota consumida (1 vídeo, 1 min)", usage?.videos_created === 1 && Number(usage?.minutes_used) === 1, JSON.stringify({ v: usage?.videos_created, m: usage?.minutes_used }));
const { data: p2 } = await A.c.from("projects").insert({ user_id: A.id, name: "Segundo" }).select().single();
await A.c.from("projects").update({ objective: "educacional", legal_area: "civel", editing_style: "institucional", platforms: ["youtube"], aspect_ratios: ["16:9"], rights_confirmed_at: new Date().toISOString() }).eq("id", p2.id);
await A.c.from("project_files").insert({ project_id: p2.id, user_id: A.id, storage_path: aPath, file_name: "t.mp4", status: "uploaded" });
const { error: eQuota } = await A.c.rpc("submit_project", { p_project_id: p2.id });
check("Cota do plano é respeitada", eQuota?.message === "quota_exceeded", eQuota?.message);
const { error: eRev } = await A.c.rpc("request_revision", { p_project_id: pA.id, p_comment: "ajuste" });
check("Ajuste só após o vídeo ficar pronto", eRev?.message === "project_not_ready", eRev?.message);
const { data: dup } = await A.c.rpc("duplicate_project", { p_project_id: pA.id, p_as_version: true });
check("Nova versão cria rascunho vinculado", dup?.status === "draft" && dup?.parent_project_id === pA.id && dup?.version === 2);
const { error: eDupB } = await B.c.rpc("duplicate_project", { p_project_id: pA.id });
check("B não duplica projeto de A", Boolean(eDupB));
const { error: eEns } = await A.c.rpc("ensure_usage", { p_user: B.id });
check("Função interna ensure_usage não é exposta", Boolean(eEns));

// limpeza
await admin.auth.admin.deleteUser(A.id);
await admin.auth.admin.deleteUser(B.id);
await admin.storage.from("original-videos").remove([aPath]);
console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
