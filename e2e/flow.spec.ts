import path from "node:path";
import { expect, test } from "@playwright/test";
import { mailLink } from "./helpers";

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
