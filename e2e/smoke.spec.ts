import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("tribuna-cookie-consent", "{}");
    } catch {}
  });
});

test("landing exibe o hero e a estátua interativa", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(/Transforme vídeos jurídicos/);
  await expect(page.locator("canvas.touch-pan-y")).toBeVisible();
  await expect(page.locator("#topo").getByRole("link", { name: /Criar primeiro projeto/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("rotas protegidas redirecionam para o login", async ({ page }) => {
  await page.goto("/app/biblioteca");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fbiblioteca/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("cadastro valida os campos em português", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: /Criar conta/ }).click();
  await expect(page.getByText("Informe seu nome completo.")).toBeVisible();
  await expect(page.getByText(/Aceite os Termos de Uso/)).toBeVisible();
});

test("páginas legais e 404", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible();
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
  const res = await page.goto("/pagina-que-nao-existe");
  expect(res?.status()).toBe(404);
});
