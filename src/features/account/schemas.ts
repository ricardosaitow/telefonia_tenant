import { z } from "zod";

import { LOCALE_VALUES } from "@/features/tenant-settings/schemas";

/**
 * Editar dados básicos da própria Account (nome + idioma do portal).
 *
 * Não inclui email (precisa de verificação off-band — V1.x), nem senha
 * (fluxo dedicado em /account/password — V1.x), nem MFA (D008 — V1.x).
 */
export const accountProfileInputSchema = z.object({
  nome: z.string().min(2).max(120).trim(),
  locale: z.enum(LOCALE_VALUES),
});

export type AccountProfileInput = z.infer<typeof accountProfileInputSchema>;
