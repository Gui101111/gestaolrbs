import path from "node:path";
import { expect, test } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

async function mailLink(email: string, type?: string) {
  for (let i = 0; i < 30; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: { ID: string; To: { Address: string }[] }[] };
    for (const msg of list.messages.filter((m) => m.To.some((t) => t.Address === email))) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string };
      const m = full.HTML.match(/href="([^"]*auth\/confirm[^"]*)"/);
      const link = m?.[1].replace(/&amp;/g, "&");
      if (link && (!type || link.includes(`type=${type}`))) return link;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("E-mail não chegou");
}

test("cadastro → confirmação → onboarding → novo vídeo → envio para edição", async ({ page, context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("tribuna-cookie-consent", "{}");
    } catch {}
  });
  const email = `e2e.${Date.now()}@escritorio.com.br`;

  await page.goto("/criar-conta");
  await page.fill("#fullName", "Dra. Teste E2E");
  await page.fill("#email", email);
  await page.fill("#password", "Senha1234forte");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /Criar conta/ }).click();
  await expect(page).toHaveURL(/verificar-email/);

  await page.goto(await mailLink(email));
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("radio", { name: "Previdenciário" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("radio", { name: "Conteúdo orgânico" }).click();
  await page.getByRole("button", { name: /Concluir/ }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/novo");
  await page.setInputFiles('input[type="file"]', path.join(__dirname, "fixtures/video-teste.mp4"));
  await expect(page.getByText("Envio concluído").first()).toBeVisible({ timeout: 60_000 });
  await page.fill("#video-name", "Vídeo E2E");
  await page.getByRole("radio", { name: "Previdenciário" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("radio", { name: /Institucional/ }).first().click();
  await page.getByRole("button", { name: /9:16/ }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: /Usar recomendado/ }).click();
  await page.locator("#rights").click();
  await page.getByRole("button", { name: /Enviar para edição/ }).click();
  await expect(page.getByText("Enviado para")).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
  await expect(page.getByText("Vídeo E2E").first()).toBeVisible();
});

test("recuperar senha → link por e-mail → nova senha → entrar", async ({ page, context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("tribuna-cookie-consent", "{}");
    } catch {}
  });
  const email = `e2e.senha.${Date.now()}@escritorio.com.br`;

  await page.goto("/criar-conta");
  await page.fill("#fullName", "Dr. Teste Senha");
  await page.fill("#email", email);
  await page.fill("#password", "Senha1234forte");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /Criar conta/ }).click();
  await expect(page).toHaveURL(/verificar-email/);
  await page.goto(await mailLink(email));
  await expect(page).toHaveURL(/onboarding/);
  await context.clearCookies();

  await page.goto("/recuperar-senha");
  await page.fill("#email", email);
  await page.getByRole("button", { name: /Enviar link/ }).click();
  await expect(page.getByText("Link enviado.")).toBeVisible();

  await page.goto(await mailLink(email, "recovery"));
  await expect(page).toHaveURL(/\/nova-senha$/);
  await page.fill("#password", "NovaSenha5678forte");
  await page.fill("#confirm", "NovaSenha5678forte");
  await page.getByRole("button", { name: /Salvar|Atualizar|Definir/ }).click();
  await expect(page).toHaveURL(/\/(app|onboarding)/, { timeout: 30_000 });

  await context.clearCookies();
  await page.goto("/entrar");
  await page.fill("#email", email);
  await page.fill("#password", "NovaSenha5678forte");
  await page.getByRole("button", { name: /^Entrar/ }).click();
  await expect(page).toHaveURL(/\/(app|onboarding)/, { timeout: 30_000 });
});
