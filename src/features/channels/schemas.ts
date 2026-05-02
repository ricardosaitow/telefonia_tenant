import { z } from "zod";

/**
 * Channel input — V1 com SIP Trunk + WhatsApp auto-provisioning:
 *  - tipo + identificador (DID, número WA, email, etc) + nome amigável
 *  - SIP trunk fields condicionais (obrigatórios quando tipo = voice_did)
 *  - WhatsApp: identificador auto-gerado, container provisionado automaticamente
 */
export const channelTypeSchema = z.enum(["voice_did", "whatsapp", "email", "webchat"]);

const sipFields = {
  sipHost: z.string().max(255).trim().optional().or(z.literal("")),
  sipPort: z.coerce.number().int().min(1).max(65535).optional(),
  sipTransport: z.enum(["udp", "tcp", "tls"]).optional(),
  sipUsername: z.string().max(255).trim().optional().or(z.literal("")),
  sipPassword: z.string().max(255).optional().or(z.literal("")),
  sipRegister: z.coerce.boolean().optional(),
};

// WhatsApp: no user-facing fields — container provisioned automatically

function channelRefine(
  data: {
    tipo: string;
    sipHost?: string;
    sipUsername?: string;
    sipPassword?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.tipo === "voice_did") {
    if (!data.sipHost) {
      ctx.addIssue({
        code: "custom",
        path: ["sipHost"],
        message: "Host SIP obrigatório para canais de voz",
      });
    }
    if (!data.sipUsername) {
      ctx.addIssue({
        code: "custom",
        path: ["sipUsername"],
        message: "Usuário SIP obrigatório para canais de voz",
      });
    }
    if (!data.sipPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["sipPassword"],
        message: "Senha SIP obrigatória para canais de voz",
      });
    }
  }
}

export const channelInputSchema = z
  .object({
    tipo: channelTypeSchema,
    identificador: z.string().max(255).trim().optional().or(z.literal("")),
    nomeAmigavel: z.string().min(2).max(120).trim(),
    ...sipFields,
  })
  .superRefine((data, ctx) => {
    // identificador obrigatório exceto pra whatsapp (auto-gerado)
    if (data.tipo !== "whatsapp" && (!data.identificador || data.identificador.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["identificador"],
        message: "Identificador obrigatório (mínimo 2 caracteres)",
      });
    }
    channelRefine(data, ctx);
  });

export const updateChannelInputSchema = z
  .object({
    id: z.string().uuid(),
    tipo: channelTypeSchema,
    identificador: z.string().max(255).trim().optional().or(z.literal("")),
    nomeAmigavel: z.string().min(2).max(120).trim(),
    ...sipFields,
  })
  .superRefine((data, ctx) => {
    if (data.tipo !== "whatsapp" && (!data.identificador || data.identificador.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["identificador"],
        message: "Identificador obrigatório (mínimo 2 caracteres)",
      });
    }
    channelRefine(data, ctx);
  });

export type ChannelInput = z.infer<typeof channelInputSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelInputSchema>;

export const CHANNEL_TYPE_LABEL: Record<z.infer<typeof channelTypeSchema>, string> = {
  voice_did: "Voz (DID)",
  whatsapp: "WhatsApp",
  email: "Email",
  webchat: "Webchat",
};
