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
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(/Vídeos jurídicos editados por IA/);
  await expect(page.locator("canvas.touch-pan-y")).toBeVisible();
  await expect(page.locator("#topo").getByRole("link", { name: /Criar meu primeiro vídeo/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("abas do Explorar respondem ao hash e ao teclado", async ({ page }) => {
  await page.goto("/#planos");
  await expect(page.getByRole("tab", { name: "Planos" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Planos" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: "Dúvidas" })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/#duvidas$/);
});

test("rotas antigas de acesso redirecionam para as novas", async ({ page }) => {
  await page.goto("/login?next=%2Fapp");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fapp$/);
  await expect(page.getByRole("button", { name: /Continuar com Google/ })).toBeVisible();
  await page.goto("/register");
  await expect(page).toHaveURL(/\/criar-conta$/);
  await page.goto("/app/perfil");
  await expect(page).toHaveURL(/\/entrar/);
});

test("rotas protegidas redirecionam para o login", async ({ page }) => {
  await page.goto("/app/projetos");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fapp%2Fprojetos/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar/);
});

test("cadastro valida os campos em português", async ({ page }) => {
  await page.goto("/criar-conta");
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(/Página fora dos autos/);
});
