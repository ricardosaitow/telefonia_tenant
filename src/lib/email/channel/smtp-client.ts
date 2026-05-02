import nodemailer from "nodemailer";

import type { ConnectionTestResult, SmtpConfig } from "./types";

type SendAttachment = {
  filename: string;
  path: string;
  contentType?: string;
};

type SendEnvelope = {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: SendAttachment[];
};

/**
 * Send an email via tenant-configured SMTP.
 * Returns the Message-ID assigned by the server.
 */
export async function sendViaSmtp(
  config: SmtpConfig,
  envelope: SendEnvelope,
): Promise<{ messageId: string }> {
  const transport = createTransport(config);

  try {
    const info = await transport.sendMail({
      from: envelope.from,
      to: envelope.to,
      cc: envelope.cc,
      subject: envelope.subject,
      html: envelope.html,
      text: envelope.text,
      headers: envelope.headers,
      attachments: envelope.attachments?.map((a) => ({
        filename: a.filename,
        path: a.path,
        contentType: a.contentType,
      })),
    });

    return { messageId: info.messageId };
  } finally {
    transport.close();
  }
}

/**
 * Test SMTP connection by attempting EHLO + AUTH.
 */
export async function testSmtpConnection(config: SmtpConfig): Promise<ConnectionTestResult> {
  const transport = createTransport(config);

  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown SMTP error" };
  } finally {
    transport.close();
  }
}

function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.security === "tls",
    auth: {
      user: config.user,
      pass: config.pass,
    },
    ...(config.security === "starttls" ? { requireTLS: true } : {}),
    ...(config.security === "none" ? { tls: { rejectUnauthorized: false } } : {}),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}
