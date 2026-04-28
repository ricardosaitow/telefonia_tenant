import { z } from "zod";

/**
 * Schema do form "Criar nova empresa". Mesma regra de min/max do signup
 * (consistência) — nomeTenant entre 2 e 120 chars.
 */
export const createTenantSchema = z.object({
  nomeTenant: z.string().min(2).max(120).trim(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
