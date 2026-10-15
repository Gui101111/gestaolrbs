import { z } from "zod";
import { emailSchema, nameSchema, passwordSchema } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const registerSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  terms: z.boolean().refine((v) => v, "Aceite os Termos de Uso e a Política de Privacidade."),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string().min(1, "Confirme a nova senha.") })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });
