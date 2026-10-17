import { expect, type Page } from "@playwright/test";

export const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Link de confirmação/recuperação do e-mail mais recente para o endereço (Mailpit local). */
export async function mailLink(email: string, type?: string) {
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

/** Cadastro → confirmação por e-mail → onboarding, terminando no Início (/app). */
export async function registerAndOnboard(page: Page, email: string, name = "Dra. Teste E2E") {
  await page.goto("/criar-conta");
  await page.fill("#fullName", name);
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
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /^Entrar/ }).click();
  await expect(page).toHaveURL(/\/(app|admin|onboarding)/, { timeout: 30_000 });
}
