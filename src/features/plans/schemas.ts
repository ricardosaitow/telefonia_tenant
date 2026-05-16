import { z } from "zod";

export const choosePlanSchema = z.object({
  accountName: z.string().min(2).max(120).trim(),
  nomeTenant: z.string().min(2).max(120).trim(),
  planSlug: z.enum(["demo", "pro"]),
});

export type ChoosePlanInput = z.infer<typeof choosePlanSchema>;
