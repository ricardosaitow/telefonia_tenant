/**
 * Integration tests pro stack de autenticação (passo 8a):
 *   - argon2 hash/verify
 *   - verifyCredentials (puro, base do provider Credentials)
 *   - sessão DB-backed (create/validate/revoke)
 *   - signupAction (Server Action via next-safe-action)
 *
 * Não cobre o fluxo NextAuth signIn() ponta-a-ponta — isso depende do
 * runtime Next.js (cookies/redirect) e fica pra E2E (V1.5).
 */

import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { signupAction } from "@/features/auth/signup";
import { hashPassword, verifyPassword } from "@/lib/auth/argon2";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession, revokeSession, validateSession } from "@/lib/auth/session";

import { makeAccount } from "../helpers/factories";
import { asMigrator } from "../helpers/tenants";

afterAll(async () => {
  // Cleanup — sessions e accounts criadas no test podem poluir runs futuras
  // se reusarmos container.
  await asMigrator(async (tx) => {
    await tx.session.deleteMany();
    await tx.account.deleteMany();
  });
});

describe("argon2", () => {
  it("hashPassword + verifyPassword: roundtrip", async () => {
    const hash = await hashPassword("uma-senha-de-teste-12345");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
    expect(await verifyPassword(hash, "uma-senha-de-teste-12345")).toBe(true);
    expect(await verifyPassword(hash, "senha-errada")).toBe(false);
  });
});

describe("verifyCredentials", () => {
  it("ok pra email e senha corretos", async () => {
    const password = "senha-correta-12345"; // gitleaks:allow
    const passwordHash = await hashPassword(password);
    const email = `vc-ok-${randomUUID()}@test.local`;
    await makeAccount({ email, passwordHash });

    const result = await verifyCredentials(email, password);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.account.email).toBe(email);
  });

  it("invalid pra senha errada (não vaza qual campo falhou)", async () => {
    const passwordHash = await hashPassword("senha-original-12345");
    const email = `vc-bad-${randomUUID()}@test.local`;
    await makeAccount({ email, passwordHash });

    const result = await verifyCredentials(email, "senha-errada-99999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("invalid pra email inexistente (sentinel hash mantém timing)", async () => {
    const result = await verifyCredentials(
      `inexistente-${randomUUID()}@nope.test`,
      "qualquer-senha-12345",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("normaliza email: maiúsculas e espaços extras", async () => {
    const password = "senha-correta-12345"; // gitleaks:allow
    const passwordHash = await hashPassword(password);
    const baseEmail = `vc-norm-${randomUUID()}@test.local`;
    await makeAccount({ email: baseEmail, passwordHash });

    const result = await verifyCredentials(`  ${baseEmail.toUpperCase()}  `, password);
    expect(result.ok).toBe(true);
  });

  it("disabled retorna reason=disabled (mesmo com senha certa)", async () => {
    const password = "senha-correta-12345"; // gitleaks:allow
    const passwordHash = await hashPassword(password);
    const email = `vc-dis-${randomUUID()}@test.local`;
    const account = await makeAccount({ email, passwordHash });
    await asMigrator((tx) =>
      tx.account.update({ where: { id: account.id }, data: { status: "disabled" } }),
    );

    const result = await verifyCredentials(email, password);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("disabled");
  });
});

describe("session DB-backed", () => {
  it("createSession devolve token base64url e grava no DB", async () => {
    const account = await makeAccount();
    const created = await createSession({ accountId: account.id });

    expect(created.sessionToken).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const row = await asMigrator((tx) =>
      tx.session.findUnique({ where: { sessionToken: created.sessionToken } }),
    );
    expect(row?.accountId).toBe(account.id);
    expect(row?.revokedAt).toBeNull();
  });

  it("validateSession retorna account quando válida", async () => {
    const account = await makeAccount();
    const { sessionToken } = await createSession({ accountId: account.id });

    const validated = await validateSession(sessionToken);
    expect(validated).not.toBeNull();
    expect(validated?.account.id).toBe(account.id);
    expect(validated?.account.email).toBe(account.email);
  });

  it("validateSession rejeita após revoke", async () => {
    const account = await makeAccount();
    const { sessionToken } = await createSession({ accountId: account.id });

    await revokeSession(sessionToken);
    expect(await validateSession(sessionToken)).toBeNull();
  });

  it("validateSession rejeita expirada", async () => {
    const account = await makeAccount();
    const { sessionToken } = await createSession({ accountId: account.id });

    // Força expirada via update direto.
    await asMigrator((tx) =>
      tx.session.update({
        where: { sessionToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      }),
    );
    expect(await validateSession(sessionToken)).toBeNull();
  });

  it("validateSession rejeita se Account não está active", async () => {
    const account = await makeAccount();
    const { sessionToken } = await createSession({ accountId: account.id });

    await asMigrator((tx) =>
      tx.account.update({ where: { id: account.id }, data: { status: "locked" } }),
    );
    expect(await validateSession(sessionToken)).toBeNull();
  });
});

describe("signupAction (onboarding)", () => {
  it("cria Account only (sem Tenant/Membership)", async () => {
    const email = `signup-${randomUUID()}@test.local`;
    const result = await signupAction({
      email,
      password: "senha-de-signup-12345", // gitleaks:allow
      confirmPassword: "senha-de-signup-12345", // gitleaks:allow
      nome: "Signup Teste",
    });

    expect(result?.data?.ok).toBe(true);

    const account = await asMigrator((tx) =>
      tx.account.findUnique({
        where: { email },
        include: { memberships: true },
      }),
    );
    expect(account).not.toBeNull();
    expect(account?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(account?.nome).toBe("Signup Teste");
    expect(account?.memberships).toHaveLength(0);
  });

  it("idempotente: email duplicado retorna ok e NÃO cria segunda Account", async () => {
    const email = `dup-${randomUUID()}@test.local`;
    const r1 = await signupAction({
      email,
      password: "senha-aaaa-12345", // gitleaks:allow
      confirmPassword: "senha-aaaa-12345", // gitleaks:allow
      nome: "Primeiro",
    });
    const r2 = await signupAction({
      email,
      password: "senha-bbbb-12345", // gitleaks:allow
      confirmPassword: "senha-bbbb-12345", // gitleaks:allow
      nome: "Segundo",
    });

    expect(r1?.data?.ok).toBe(true);
    expect(r2?.data?.ok).toBe(true);

    const accounts = await asMigrator((tx) => tx.account.findMany({ where: { email } }));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.nome).toBe("Primeiro");
  });

  it("rejeita password curta via Zod (validationErrors)", async () => {
    const email = `short-${randomUUID()}@test.local`;
    const result = await signupAction({
      email,
      password: "curta",
      confirmPassword: "curta",
      nome: "Teste",
    });
    expect(result?.data?.ok).toBeUndefined();
    expect(result?.validationErrors).toBeDefined();
  });
});
