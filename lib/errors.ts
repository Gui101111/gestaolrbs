/**
 * Traduz erros técnicos (Supabase, RPC, rede, gateway) em mensagens claras em português.
 * Nunca exponha a mensagem bruta ao usuário.
 */
const MESSAGES: Record<string, string> = {
  // Auth
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.",
  user_already_exists: "Este e-mail já possui uma conta. Entre com ela ou recupere sua senha.",
  email_exists: "Este e-mail já possui uma conta. Entre com ela ou recupere sua senha.",
  weak_password: "Escolha uma senha mais forte, com pelo menos 8 caracteres, letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde um minuto e tente novamente.",
  over_request_rate_limit: "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
  otp_expired: "Este link expirou ou já foi utilizado. Solicite um novo.",
  session_expired: "Sua sessão expirou. Entre novamente para continuar.",
  session_not_found: "Sua sessão expirou. Entre novamente para continuar.",
  validation_failed: "Verifique os dados informados.",
  signup_disabled: "Novos cadastros estão temporariamente desativados.",
  // Projetos
  project_not_found: "Projeto não encontrado.",
  project_not_draft: "Este projeto já foi enviado para edição.",
  project_incomplete: "Complete todas as etapas antes de iniciar a edição.",
  project_locked: "Projetos enviados não podem ser alterados. Crie uma nova versão.",
  rights_not_confirmed: "Confirme que você possui o direito de uso da imagem e do conteúdo.",
  missing_video: "Envie o vídeo antes de iniciar a edição.",
  subscription_required: "Você precisa de uma assinatura ativa para iniciar novas edições.",
  quota_exceeded: "Você atingiu o limite de vídeos do seu plano neste ciclo.",
  minutes_exceeded: "Este vídeo ultrapassa os minutos disponíveis no seu plano neste ciclo.",
  video_too_long: "O vídeo excede a duração máxima permitida pelo seu plano.",
  project_not_ready: "O vídeo ainda não está pronto para esta ação.",
  revisions_exceeded: "Você já utilizou todos os ajustes disponíveis para este vídeo.",
  // Pastas
  folder_depth: "As pastas podem ter no máximo 3 níveis.",
  folder_cycle: "Uma pasta não pode ficar dentro dela mesma.",
  folder_parent_invalid: "Pasta de destino não encontrada.",
  folder_invalid: "Pasta não encontrada.",
  folder_not_found: "Pasta não encontrada.",
  // Upload
  file_too_large: "O arquivo é maior do que o limite de envio. Grave um trecho menor ou exporte em resolução menor.",
  invalid_file: "Este arquivo não parece ser um vídeo. Escolha um vídeo da galeria (MP4, MOV ou WEBM).",
  upload_interrupted: "O envio foi interrompido. Verifique sua conexão — você pode retomar de onde parou.",
  // Geral
  network: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
  payments_not_configured: "Os pagamentos ainda não estão disponíveis. Entre na lista para ser avisado.",
  plan_without_price: "Este plano ainda não tem valor definido.",
  forbidden: "Você não tem permissão para esta ação.",
  unknown: "Algo não saiu como esperado. Tente novamente em instantes.",
};

const PATTERNS: [RegExp, string][] = [
  [/invalid login credentials/i, "invalid_credentials"],
  [/email not confirmed/i, "email_not_confirmed"],
  [/already (been )?registered|already exists/i, "user_already_exists"],
  [/password should|weak password|password is too/i, "weak_password"],
  [/rate limit|too many/i, "over_request_rate_limit"],
  [/expired|invalid.*(token|otp)/i, "otp_expired"],
  [/jwt|refresh token|session/i, "session_expired"],
  [/failed to fetch|networkerror|network request failed|load failed/i, "network"],
  [/payload too large|maximum allowed size|exceeded the maximum/i, "file_too_large"],
  [/mime type|invalid_mime/i, "invalid_file"],
  [/permission denied|row-level security|violates row-level/i, "forbidden"],
];

export function errorCode(error: unknown): string {
  if (!error) return "unknown";
  const e = error as { code?: string; message?: string; error_code?: string };
  const raw = e.code ?? e.error_code;
  if (raw && MESSAGES[raw]) return raw;
  const msg = typeof error === "string" ? error : (e.message ?? "");
  if (MESSAGES[msg]) return msg;
  for (const [re, code] of PATTERNS) if (re.test(msg)) return code;
  return "unknown";
}

export function friendlyError(error: unknown, fallback?: string): string {
  const code = errorCode(error);
  if (code === "unknown" && fallback) return fallback;
  return MESSAGES[code] ?? MESSAGES.unknown;
}

export function messageFor(code: string) {
  return MESSAGES[code] ?? MESSAGES.unknown;
}
