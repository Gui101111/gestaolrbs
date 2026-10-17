import { z } from "zod";
import { BRAZIL_UFS, LEGAL_AREAS, PROFILE_GOALS } from "@/lib/constants/domain";
import { nameSchema } from "./common";

const legalAreaValues = LEGAL_AREAS.map((a) => a.value) as [string, ...string[]];
const goalValues = PROFILE_GOALS.map((g) => g.value) as [string, ...string[]];

export const onboardingSchema = z.object({
  fullName: nameSchema,
  officeName: z.string().trim().max(120, "Nome muito longo.").optional().or(z.literal("")),
  oabNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9.\-A-Za-z]*$/, "Use apenas números.")
    .optional()
    .or(z.literal("")),
  oabUf: z.enum(BRAZIL_UFS).optional().or(z.literal("")),
  legalArea: z.enum(legalAreaValues, { error: "Escolha sua área principal." }),
  mainGoal: z.enum(goalValues, { error: "Escolha o objetivo principal." }),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.");

export const profileSchema = z.object({
  fullName: nameSchema,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  officeName: z.string().trim().max(120).optional().or(z.literal("")),
  oabNumber: z.string().trim().max(20).optional().or(z.literal("")),
  oabUf: z.enum(BRAZIL_UFS).optional().or(z.literal("")),
  legalArea: z.enum(legalAreaValues).optional().or(z.literal("")),
  mainGoal: z.enum(goalValues).optional().or(z.literal("")),
  treatment: z.enum(["dr", "dra"]).optional().or(z.literal("")),
  practiceAreas: z.array(z.enum(legalAreaValues)).max(12).optional(),
});
export type ProfileInput = z.input<typeof profileSchema>;

export const brandKitSchema = z.object({
  officeName: z.string().trim().max(120).optional().or(z.literal("")),
  professionalName: z.string().trim().max(120).optional().or(z.literal("")),
  oabDisplay: z.string().trim().max(60).optional().or(z.literal("")),
  primaryColor: hex,
  secondaryColor: hex,
  accentColor: hex,
  font: z.string().trim().max(60).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v), "Informe um site válido.")
    .optional()
    .or(z.literal("")),
  instagram: z
    .string()
    .trim()
    .max(80)
    .refine((v) => !v || /^@?[\w.]{1,30}$/.test(v), "Informe apenas o @ do perfil.")
    .optional()
    .or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Informe o número com DDD.")
    .optional()
    .or(z.literal("")),
});
export type BrandKitInput = z.input<typeof brandKitSchema>;

export const preferencesSchema = z.object({
  defaultEditingStyle: z.string().max(40).optional().or(z.literal("")),
  defaultPlatforms: z.array(z.string().max(40)).max(10),
  emailNotifications: z.boolean(),
  productNews: z.boolean(),
});
export type PreferencesInput = z.input<typeof preferencesSchema>;
