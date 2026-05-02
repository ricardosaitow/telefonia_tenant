/**
 * Types for tenant-configured email channels (SMTP outbound + IMAP/POP3 inbound).
 * Used by smtp-client, imap-client, pop3-client and the poll worker.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  security: "tls" | "starttls" | "none";
};

export type InboundConfig = {
  proto: "imap" | "pop3";
  host: string;
  port: number;
  user: string;
  pass: string;
  security: "tls" | "starttls" | "none";
};

export type InboundMessage = {
  messageId: string | null;
  uid?: number;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
  date: Date | null;
  inReplyTo: string | null;
  references: string[];
  sizeBytes?: number;
  /** IMAP mailbox path (e.g. "INBOX", "Sent") */
  mailbox?: string;
  /** Whether the message was already read on the server */
  isRead?: boolean;
};

export type ConnectionTestResult = {
  ok: boolean;
  error?: string;
};
