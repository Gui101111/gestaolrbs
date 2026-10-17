/** Rotas públicas e do app em um só lugar (os links do site leem daqui). */
export const ROUTES = {
  home: "/",
  login: "/entrar",
  register: "/criar-conta",
  verifyEmail: "/verificar-email",
  forgotPassword: "/recuperar-senha",
  resetPassword: "/nova-senha",
  terms: "/termos",
  privacy: "/privacidade",

  app: "/app",
  projects: "/app/projetos",
  newVideo: "/app/novo",
  examples: "/app/exemplos",
  howTo: "/app/como-fazer",
  brand: "/app/marca",
  billing: "/app/assinatura",
  settings: "/app/configuracoes",
  folder: (id: string) => `/app/projetos/${id}`,
  video: (id: string) => `/app/video/${id}`,
} as const;
