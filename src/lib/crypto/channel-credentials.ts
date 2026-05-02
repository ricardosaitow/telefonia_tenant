import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encrypt/decrypt for channel credentials (SMTP/IMAP/POP3 passwords).
 *
 * Format: base64(IV[12] + ciphertext + authTag[16])
 *
 * Key via CHANNEL_ENCRYPTION_KEY env var (hex-encoded 32 bytes = 64 hex chars).
 * Temporary solution — Infisical migration planned (D009).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Returns true if CHANNEL_ENCRYPTION_KEY is properly configured.
 * Use this to guard actions before attempting encrypt/decrypt.
 */
export function isEncryptionConfigured(): boolean {
  const hex = process.env.CHANNEL_ENCRYPTION_KEY;
  return typeof hex === "string" && hex.length === 64;
}

function getKey(): Buffer {
  const hex = process.env.CHANNEL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CHANNEL_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // IV + ciphertext + tag
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

export function decryptCredential(encoded: string): string {
  const key = getKey();
  const buf = Buffer.from(encoded, "base64");

  if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted credential: too short");
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}
