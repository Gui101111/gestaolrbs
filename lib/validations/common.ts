import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .max(254, "E-mail muito longo.")
  .email("Informe um e-mail válido.")
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra.")
  .regex(/\d/, "Inclua ao menos um número.");

export const nameSchema = z.string().trim().min(2, "Informe seu nome completo.").max(120, "Nome muito longo.");

export function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(4, Math.max(0, score - (pw.length < 8 ? 2 : 0)));
  const labels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Excelente"];
  return { score: level, label: pw ? labels[level] : "" };
}
