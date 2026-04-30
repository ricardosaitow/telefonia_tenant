import { Resend } from "resend";

/**
 * Resend client (lazy singleton).
 *
 * Em dev sem `RESEND_API_KEY` → retorna `null` e o helper `sendEmail`
 * faz fallback pra console.log. Em prod a key vem do Infisical (V1.5)
 * via `getSecret("/platform/resend_api_key")`; por ora vem do env.
 */

let cached: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (cached !== undefined) return cached;

  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    cached = null;
    return cached;
  }

  cached = new Resend(key);
  return cached;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "noreply@pekiart.com.br";
}
