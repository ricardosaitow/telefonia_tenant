import { z } from "zod";

/**
 * Channel input — V1 simplificado:
 *  - tipo + identificador (DID, número WA, email, etc) + nome amigável
 *  - status fixo em "active" no create (workflow de provisioning real chega
 *    quando data plane integrar)
 *
 * Validação por tipo: regra mínima por agora; tipo-específica vai pra V1.x
 * (E.164 pra DID, WA Business format, RFC 5322 pra email, etc).
 */
export const channelTypeSchema = z.enum(["voice_did", "whatsapp", "email", "webchat"]);

export const channelInputSchema = z.object({
  tipo: channelTypeSchema,
  identificador: z.string().min(2).max(255).trim(),
  nomeAmigavel: z.string().min(2).max(120).trim(),
});

export const updateChannelInputSchema = channelInputSchema.extend({
  id: z.string().uuid(),
});

export type ChannelInput = z.infer<typeof channelInputSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelInputSchema>;

export const CHANNEL_TYPE_LABEL: Record<z.infer<typeof channelTypeSchema>, string> = {
  voice_did: "Voz (DID)",
  whatsapp: "WhatsApp",
  email: "Email",
  webchat: "Webchat",
};
