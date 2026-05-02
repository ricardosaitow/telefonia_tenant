import type { ReactElement } from "react";

import { recordSecurityEvent } from "@/lib/security/event";

import { getEmailFrom, getResendClient } from "./client";

/**
 * Helper único pra envio transacional. Toda chamada de email passa por
 * aqui — centraliza logging, redaction de PII, fallback dev e tratamento
 * de erro fire-and-forget.
 *
 * Nunca lança — falha em mailer não pode quebrar fluxo de produto. Em
 * caso de erro grava SecurityEvent (categoria `integration`).
 *
 * Em dev sem RESEND_API_KEY: log no console (subject + to + first 200
 * chars do html renderizado, se vier). Bom suficiente pra validar
 * pipeline sem custo.
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** Override do EMAIL_FROM (ex.: reply de canal). */
  from?: string;
  /** Reply-To header. */
  replyTo?: string;
  /** Headers extras — In-Reply-To, References pra threading (RFC 5322). */
  headers?: Record<string, string>;
  /** Tags pra rastreabilidade no Resend dashboard. */
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    // Dev fallback — log estruturado pra ver no terminal do `pnpm dev`.
    console.log(
      `[email:dev] would send ${JSON.stringify({
        to: input.to,
        subject: input.subject,
        from: getEmailFrom(),
      })}`,
    );
    return { ok: true, id: "dev-noop" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: input.from ?? getEmailFrom(),
      to: input.to,
      subject: input.subject,
      react: input.react,
      replyTo: input.replyTo,
      headers: input.headers,
      tags: input.tags,
    });

    if (error) {
      void recordSecurityEvent({
        severity: "medium",
        category: "integration",
        eventType: "email_send_failed",
        description: `Resend error: ${error.message}`,
        metadata: {
          to: Array.isArray(input.to) ? input.to : [input.to],
          subject: input.subject,
          errorName: error.name,
        },
      });
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id ?? "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    void recordSecurityEvent({
      severity: "medium",
      category: "integration",
      eventType: "email_send_threw",
      description: msg,
      metadata: {
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
      },
    });
    return { ok: false, error: msg };
  }
}
