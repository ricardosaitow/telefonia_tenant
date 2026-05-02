import { z } from "zod";

/**
 * Channel input — V1 com SIP Trunk + WhatsApp auto-provisioning + Email SMTP/IMAP/POP3:
 *  - tipo + identificador (DID, número WA, email, etc) + nome amigável
 *  - SIP trunk fields condicionais (obrigatórios quando tipo = voice_did)
 *  - WhatsApp: identificador auto-gerado, container provisionado automaticamente
 *  - Email: SMTP outbound + IMAP/POP3 inbound config
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

export const emailSecuritySchema = z.enum(["tls", "starttls", "none"]);
export const inboundProtoSchema = z.enum(["imap", "pop3"]);

const emailFields = {
  // SMTP outbound
  smtpHost: z.string().max(255).trim().optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(255).trim().optional().or(z.literal("")),
  smtpPass: z.string().max(255).optional().or(z.literal("")),
  smtpSecurity: emailSecuritySchema.optional(),
  // Inbound
  inboundProto: inboundProtoSchema.optional(),
  inboundHost: z.string().max(255).trim().optional().or(z.literal("")),
  inboundPort: z.coerce.number().int().min(1).max(65535).optional(),
  inboundUser: z.string().max(255).trim().optional().or(z.literal("")),
  inboundPass: z.string().max(255).optional().or(z.literal("")),
  inboundSecurity: emailSecuritySchema.optional(),
};

// WhatsApp: no user-facing fields — container provisioned automatically

function channelRefine(
  data: {
    tipo: string;
    identificador?: string;
    sipHost?: string;
    sipUsername?: string;
    sipPassword?: string;
    smtpHost?: string;
    smtpUser?: string;
    smtpPass?: string;
    inboundProto?: string;
    inboundHost?: string;
    inboundUser?: string;
    inboundPass?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.tipo === "email" && data.identificador) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.identificador)) {
      ctx.addIssue({
        code: "custom",
        path: ["identificador"],
        message: "Identificador deve ser um email válido para canais de email",
      });
    }
  }

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

  if (data.tipo === "email") {
    if (!data.smtpHost) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpHost"],
        message: "Servidor SMTP obrigatório para canais de email",
      });
    }
    if (!data.smtpUser) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpUser"],
        message: "Usuário SMTP obrigatório para canais de email",
      });
    }
    if (!data.smtpPass) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpPass"],
        message: "Senha SMTP obrigatória para canais de email",
      });
    }
    if (!data.inboundProto) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundProto"],
        message: "Protocolo de recebimento obrigatório para canais de email",
      });
    }
    if (!data.inboundHost) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundHost"],
        message: "Servidor de recebimento obrigatório para canais de email",
      });
    }
    if (!data.inboundUser) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundUser"],
        message: "Usuário de recebimento obrigatório para canais de email",
      });
    }
    if (!data.inboundPass) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundPass"],
        message: "Senha de recebimento obrigatória para canais de email",
      });
    }
  }
}

/** Refine for update: password empty = keep existing (handled in action) */
function channelRefineUpdate(
  data: {
    tipo: string;
    identificador?: string;
    sipHost?: string;
    sipUsername?: string;
    sipPassword?: string;
    smtpHost?: string;
    smtpUser?: string;
    smtpPass?: string;
    inboundProto?: string;
    inboundHost?: string;
    inboundUser?: string;
    inboundPass?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.tipo === "email" && data.identificador) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.identificador)) {
      ctx.addIssue({
        code: "custom",
        path: ["identificador"],
        message: "Identificador deve ser um email válido para canais de email",
      });
    }
  }

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
    // sipPassword empty on update = keep existing
  }

  if (data.tipo === "email") {
    if (!data.smtpHost) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpHost"],
        message: "Servidor SMTP obrigatório para canais de email",
      });
    }
    if (!data.smtpUser) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpUser"],
        message: "Usuário SMTP obrigatório para canais de email",
      });
    }
    // smtpPass empty on update = keep existing
    if (!data.inboundProto) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundProto"],
        message: "Protocolo de recebimento obrigatório",
      });
    }
    if (!data.inboundHost) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundHost"],
        message: "Servidor de recebimento obrigatório",
      });
    }
    if (!data.inboundUser) {
      ctx.addIssue({
        code: "custom",
        path: ["inboundUser"],
        message: "Usuário de recebimento obrigatório",
      });
    }
    // inboundPass empty on update = keep existing
  }
}

export const channelInputSchema = z
  .object({
    tipo: channelTypeSchema,
    identificador: z.string().max(255).trim().optional().or(z.literal("")),
    nomeAmigavel: z.string().min(2).max(120).trim(),
    ...sipFields,
    ...emailFields,
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
    ...emailFields,
  })
  .superRefine((data, ctx) => {
    if (data.tipo !== "whatsapp" && (!data.identificador || data.identificador.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["identificador"],
        message: "Identificador obrigatório (mínimo 2 caracteres)",
      });
    }
    channelRefineUpdate(data, ctx);
  });

export type ChannelInput = z.infer<typeof channelInputSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelInputSchema>;

export const CHANNEL_TYPE_LABEL: Record<z.infer<typeof channelTypeSchema>, string> = {
  voice_did: "Voz (DID)",
  whatsapp: "WhatsApp",
  email: "Email",
  webchat: "Webchat",
};
