/**
 * Rate limit (seguranca.md §5.5).
 *
 * Sem `server-only` aqui pra que `tests/unit/` consiga importar. O store é
 * Node-only por construção (Map global), então cliente não consegue rodar
 * mesmo sem o guard explícito.
 *
 * V1: in-memory store (single-instance VPS). Implementa a interface
 * `RateLimitStore` pra que V1.5 troque pra Redis (`@upstash/ratelimit`)
 * sem mexer nos call-sites.
 *
 * Limitação V1: estado por-instância. Multi-instance precisa Redis. Por
 * ora estamos em uma VPS, isso é aceito.
 *
 * Janelas pequenas (60s) com counts pequenos: o bucket é leve e expira
 * por LRU lazy (no `incr`, sem timer/setInterval que vaza em dev/HMR).
 *
 * Uso:
 *   const result = await checkRateLimit({ key: `login:${ip}`, limit: 10, windowSec: 60 });
 *   if (!result.ok) return error("Muitas tentativas, espere ${result.resetSec}s.");
 */

export interface RateLimitStore {
  /**
   * Incrementa o contador da chave; retorna o valor APÓS o incremento.
   * Auto-expira após `windowSec` desde a primeira escrita.
   */
  incr(key: string, windowSec: number): Promise<number>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; expiresAt: number }>();

  async incr(key: string, windowSec: number): Promise<number> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
      // Lazy cleanup: oportunista, evita timer. Se >1000 buckets, limpa
      // expirados nesta call. Garante bound em uso normal.
      if (this.buckets.size > 1000) this.evictExpired(now);
      return 1;
    }

    bucket.count += 1;
    return bucket.count;
  }

  private evictExpired(now: number): void {
    for (const [k, v] of this.buckets) {
      if (v.expiresAt <= now) this.buckets.delete(k);
    }
  }
}

// Singleton — module-level pra sobreviver entre requests no mesmo processo.
const store: RateLimitStore = new MemoryStore();

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; resetSec: number };

export async function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const count = await store.incr(opts.key, opts.windowSec);
  if (count > opts.limit) {
    return { ok: false, resetSec: opts.windowSec };
  }
  return { ok: true, remaining: opts.limit - count };
}

/**
 * Limites canônicos da spec (seguranca.md §5.5). Usar essas constantes
 * pra ficar consistente entre call-sites.
 */
export const RATE_LIMITS = {
  LOGIN: { limit: 10, windowSec: 60 }, // 10/min/IP
  SIGNUP: { limit: 5, windowSec: 60 }, // 5/min/IP — signup é bem mais pesado (cria tenant)
  AUTHENTICATED_API: { limit: 60, windowSec: 60 }, // 60/min/account
  EXPENSIVE: { limit: 5, windowSec: 60 }, // 5/min/account — publish, conectar integração
} as const;
