import { z } from "zod";

import { LOCALE_VALUES } from "@/features/tenant-settings/schemas";

/**
 * MessageTemplate (Ontologia §13).
 *
 * V1: somente scope=tenant. Templates por department/channel/agent
 * chegam quando precisarem de picker. Resolução em runtime já está
 * preparada pra cascata (agent > department > tenant > default_locale
 * fallback) — estrutura aqui não muda.
 *
 * `key` é livre, mas sugerimos o catálogo padrão (out_of_hours,
 * ivr_welcome, transfer_handoff, error_fallback). Cliente pode criar
 * keys customizadas.
 */

export const TEMPLATE_KEY_SUGGESTIONS = [
  "out_of_hours",
  "ivr_welcome",
  "transfer_handoff",
  "transfer_to_department",
  "transfer_to_human",
  "error_fallback",
  "greeting",
  "goodbye",
] as const;

export const templateInputSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(80)
    .trim()
    .regex(/^[a-z0-9_]+$/, "use apenas a-z, 0-9 e underscore"),
  locale: z.enum(LOCALE_VALUES),
  content: z.string().min(1).max(2000).trim(),
});

export const updateTemplateInputSchema = templateInputSchema.extend({
  id: z.string().uuid(),
});

export const deleteTemplateInputSchema = z.object({
  id: z.string().uuid(),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;
