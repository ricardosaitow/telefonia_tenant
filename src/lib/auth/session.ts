import { randomBytes } from "node:crypto";

import type { Session } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";

/**
 * Sessão DB-backed, mesmo com NextAuth forçando strategy=jwt pra Credentials
 * (UnsupportedStrategy se tentar database). O JWT carrega só `sessionToken`
 * opaco; cada request valida contra esta tabela. Revogação é IMEDIATA
 * (D008/seguranca.md §6.2): basta `revokedAt = now()` que próxima request cai.
 */

const TOKEN_BYTES = 32;
const DEFAULT_TTL_HOURS = 8;

export type CreateSessionInput = {
  accountId: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  ttlHours?: number | undefined;
};

export type CreateSessionResult = {
  sessionToken: string;
  expiresAt: Date;
  sessionId: string;
};

export async function createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
  const sessionToken = randomBytes(TOKEN_BYTES).toString("base64url");
  const ttlMs = (input.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  const session = await prisma.session.create({
    data: {
      sessionToken,
      accountId: input.accountId,
      expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return { sessionToken, expiresAt, sessionId: session.id };
}

export type ValidatedSession = {
  session: Session;
  account: {
    id: string;
    email: string;
    nome: string;
    locale: string;
  };
};

export async function validateSession(sessionToken: string): Promise<ValidatedSession | null> {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      account: {
        select: { id: true, email: true, nome: true, locale: true, status: true },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt <= new Date()) return null;
  if (session.account.status !== "active") return null;

  return {
    session,
    account: {
      id: session.account.id,
      email: session.account.email,
      nome: session.account.nome,
      locale: session.account.locale,
    },
  };
}

export async function revokeSession(sessionToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { sessionToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForAccount(accountId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
