import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { login, registerAndOnboard } from "./helpers";

/**
 * Edição automática de ponta a ponta, pela interface:
 * cliente envia → agente edita → equipe libera → cliente assiste e baixa →
 * pede ajuste → agente faz a v2 na mesma sessão → equipe libera → cliente vê a v2.
 *
 * Requer o app com Claude configurado (ou CLAUDE_LOCAL_SANDBOX=1 em dev),
 * HUMAN_REVIEW=true e um admin: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 * Vídeo: E2E_VIDEO (padrão: fixtures/video-teste.mp4). Com um vídeo que tenha
 * fala sensível, defina E2E_EXPECT_OAB=1 para conferir os alertas.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const VIDEO = process.env.E2E_VIDEO ?? path.join(__dirname, "fixtures/video-teste.mp4");

test.describe.configure({ mode: "serial" });
test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD");

async function releaseWhenReady(admin: Page, projectId: string) {
  const release = admin.getByRole("button", { name: /Liberar para o cliente/ });
  for (let i = 0; i < 60; i++) {
    await admin.goto(`/admin/projetos/${projectId}`, { waitUntil: "networkidle" });
    if (await release.isVisible()) break;
    await admin.waitForTimeout(10_000);
  }
  await expect(release).toBeVisible();
  await release.click();
  await expect(admin.getByText("Vídeo liberado para o cliente.")).toBeVisible({ timeout: 30_000 });
}

test("envio → edição automática → revisão → entrega → ajuste (v2)", async ({ browser }) => {
  test.setTimeout(20 * 60_000);
  const noCookies = () => {
    try {
      localStorage.setItem("tribuna-cookie-consent", "{}");
    } catch {}
  };

  // equipe: liga o Claude como motor de edição
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await adminCtx.addInitScript(noCookies);
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN_EMAIL!, ADMIN_PASSWORD!);
  await admin.goto("/admin", { waitUntil: "networkidle" });
  const claude = admin.getByRole("radio", { name: /Claude/ });
  if ((await claude.getAttribute("aria-checked")) !== "true") {
    await claude.click();
    await expect(admin.getByText("Motor de edição atualizado.")).toBeVisible();
  }
  await expect(claude).toHaveAttribute("aria-checked", "true");

  try {
    // cliente: cadastro e envio
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(noCookies);
    const page = await ctx.newPage();
    await registerAndOnboard(page, `e2e.ia.${Date.now()}@escritorio.com.br`, "Dra. Teste IA");

    await page.goto("/app/novo");
    await page.setInputFiles('input[type="file"]', VIDEO);
    await expect(page.getByText("Envio concluído").first()).toBeVisible({ timeout: 120_000 });
    await page.fill("#video-name", "Vídeo IA E2E");
    await page.getByRole("radio", { name: "Previdenciário" }).click();
    await page.getByRole("button", { name: /Continuar/ }).click();
    await page.getByRole("radio", { name: /Dinâmico/ }).first().click();
    await page.getByRole("button", { name: /9:16/ }).click();
    await page.getByRole("button", { name: /Continuar/ }).click();
    await page.getByRole("button", { name: /Usar recomendado/ }).click();
    await page.locator("#rights").click();
    await page.getByRole("button", { name: /Enviar para edição/ }).click();
    await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });

    await page.getByText("Vídeo IA E2E").first().click();
    await expect(page).toHaveURL(/\/app\/video\/[0-9a-f-]{36}/);
    const projectId = page.url().split("/app/video/")[1].split(/[?#]/)[0];
    // a linha do tempo avança enquanto o agente trabalha
    await expect(page.getByText(/Analisando áudio|Transcrevendo|Analisando conteúdo|Criando plano|Renderizando/).first()).toBeVisible({ timeout: 120_000 });

    // equipe revisa e libera
    await releaseWhenReady(admin, projectId);

    // cliente recebe
    await page.reload();
    await expect(page.getByText(/Seu vídeo está/)).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("video").first()).toBeVisible();
    if (process.env.E2E_EXPECT_OAB) await expect(page.getByText("Pontos de atenção · OAB")).toBeVisible();
    const download = await page.request.get(`/api/projects/${projectId}/download?ratio=9:16`);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toContain("video/mp4");

    // ajuste → v2 na mesma sessão
    await page.getByRole("button", { name: /Solicitar ajuste/ }).click();
    await page.fill("#revision-comment", "Por favor, deixe o título mais curto.");
    await page.getByRole("button", { name: /Enviar ajuste/ }).click();
    await expect(page.getByText(/Em ajuste/).first()).toBeVisible({ timeout: 30_000 });

    await releaseWhenReady(admin, projectId);
    await page.reload();
    await expect(page.getByText(/Seu vídeo está/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("v2").first()).toBeVisible();
    await ctx.close();
  } finally {
    // devolve o motor ao padrão do ambiente
    await admin.goto("/admin", { waitUntil: "networkidle" });
    const back = admin.getByRole("button", { name: /voltar ao padrão/ });
    if (await back.isVisible()) await back.click();
    await adminCtx.close();
  }
});
