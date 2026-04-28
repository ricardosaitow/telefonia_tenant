import { z } from "zod";

/**
 * Schemas Zod pra Extension (ramal SIP).
 *
 * `extension` (número) — string de 3-6 dígitos. FusionPBX aceita não-numérico,
 * mas pra usabilidade limitamos a dígitos. Range típico: 1000-9999.
 *
 * `displayName` opcional — humanos lembram de "Recepção", não de "1001".
 */
export const createExtensionSchema = z.object({
  extension: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/, "Use 3 a 6 dígitos numéricos (ex.: 1001)"),
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
});

export type CreateExtensionInput = z.infer<typeof createExtensionSchema>;

export const deleteExtensionSchema = z.object({
  id: z.string().uuid(),
});

export const revealPasswordSchema = z.object({
  id: z.string().uuid(),
});
