import { z } from "zod";

/**
 * Routing rule input — V1 cobre só `tipo=direct`. Outros tipos (business_hours,
 * ivr_menu, ai_router) ganham UI dedicada em fatias futuras.
 *
 * Target: composto (targetType + targetId) — o action mapeia pro field
 * correto no DB (XOR garantido por CHECK constraint).
 */
export const routingRuleInputSchema = z.object({
  channelId: z.string().uuid(),
  targetType: z.enum(["department", "agent"]),
  targetId: z.string().uuid(),
});

export type RoutingRuleInput = z.infer<typeof routingRuleInputSchema>;
