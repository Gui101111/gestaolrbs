/**
 * Modo sem login: quem abre o app já entra como visitante (no Supabase, com
 * o login anônimo ligado em Authentication → Sign In / Providers). Some o
 * "Sair", o "Excluir conta" e as telas de entrar e criar conta.
 */
export const NO_LOGIN = process.env.NEXT_PUBLIC_NO_LOGIN === "true";
