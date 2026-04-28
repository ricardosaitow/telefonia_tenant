import { z } from "zod";

/**
 * Tenant settings — campos editáveis pelo owner/admin no portal.
 *
 * - `slug` é immutable (URL/identificador), não exposto.
 * - `status` é gerido pela Pekiart (subscription), não pelo cliente.
 * - `cnpj` validado em formato free-form (somente dígitos/máscara comum) —
 *   validação contra Receita fica fora do escopo V1.
 */
export const LOCALE_VALUES = ["pt-BR", "en-US", "es-ES"] as const;
export type Locale = (typeof LOCALE_VALUES)[number];

export const tenantSettingsInputSchema = z.object({
  nomeFantasia: z.string().min(2).max(120).trim(),
  razaoSocial: z
    .string()
    .max(200)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  cnpj: z
    .string()
    .max(20)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  dominioEmailPrincipal: z
    .string()
    .max(120)
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  defaultLocale: z.enum(LOCALE_VALUES),
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsInputSchema>;

export const LOCALE_LABEL: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-ES": "Español (España)",
};
