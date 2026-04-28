import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Cobre o store em memória — janela, contador e expiração.
 *
 * Cada teste usa keys únicas pra evitar interferência (singleton compartilhado
 * entre testes do mesmo processo). UUID prefixa pra isolar.
 */

const k = () => `test:${crypto.randomUUID()}`;

describe("checkRateLimit (memory store)", () => {
  it("permite até `limit` calls dentro da janela", async () => {
    const key = k();
    const limit = 3;

    for (let i = 1; i <= limit; i++) {
      const r = await checkRateLimit({ key, limit, windowSec: 60 });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.remaining).toBe(limit - i);
    }
  });

  it("bloqueia a partir de limit+1", async () => {
    const key = k();
    const limit = 2;

    await checkRateLimit({ key, limit, windowSec: 60 });
    await checkRateLimit({ key, limit, windowSec: 60 });

    const r = await checkRateLimit({ key, limit, windowSec: 60 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resetSec).toBe(60);
  });

  it("mantém bloqueio em calls subsequentes (não reset por uso)", async () => {
    const key = k();
    const limit = 1;

    await checkRateLimit({ key, limit, windowSec: 60 });
    const r1 = await checkRateLimit({ key, limit, windowSec: 60 });
    const r2 = await checkRateLimit({ key, limit, windowSec: 60 });

    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
  });

  it("expira a janela com windowSec curto", async () => {
    const key = k();
    const limit = 1;

    const r1 = await checkRateLimit({ key, limit, windowSec: 1 });
    expect(r1.ok).toBe(true);

    const r2 = await checkRateLimit({ key, limit, windowSec: 1 });
    expect(r2.ok).toBe(false);

    // Espera janela expirar (1.1s pra garantir).
    await new Promise((res) => setTimeout(res, 1100));

    const r3 = await checkRateLimit({ key, limit, windowSec: 1 });
    expect(r3.ok).toBe(true);
  });

  it("keys distintas têm contadores independentes", async () => {
    const keyA = k();
    const keyB = k();
    const limit = 1;

    await checkRateLimit({ key: keyA, limit, windowSec: 60 });
    const rA = await checkRateLimit({ key: keyA, limit, windowSec: 60 });
    const rB = await checkRateLimit({ key: keyB, limit, windowSec: 60 });

    expect(rA.ok).toBe(false);
    expect(rB.ok).toBe(true);
  });
});
