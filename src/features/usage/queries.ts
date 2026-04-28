import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Sumário de uso/custo (Ontologia §16, ADR D012 — Premium traz própria
 * chave Gemini, então custo "0" é esperado).
 *
 * V1: agregação on-the-fly (group by tipo, soma de quantity + total_cost).
 * Janelas: 24h, 7d, 30d. Quando o volume justificar, vira view
 * materializada (V1.5).
 *
 * `costUsdTotal` agregado também em Conversation pra cross-check rápido.
 */

export type UsageBucket = {
  tipo: string;
  quantity: number;
  totalCostUsd: number;
};

export type UsageSummary = {
  windowLabel: "24h" | "7d" | "30d";
  totalCostUsd: number;
  byTipo: UsageBucket[];
};

const WINDOWS: Array<{ label: UsageSummary["windowLabel"]; ms: number }> = [
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
];

export async function getUsageSummary(activeTenantId: string): Promise<UsageSummary[]> {
  return withTenantContext(activeTenantId, async (tx) => {
    const now = Date.now();

    const buckets = await Promise.all(
      WINDOWS.map(async (win) => {
        const since = new Date(now - win.ms);
        const grouped = await tx.usageRecord.groupBy({
          by: ["tipo"],
          where: { recordedAt: { gte: since } },
          _sum: { quantity: true, totalCostUsd: true },
          orderBy: { _sum: { totalCostUsd: "desc" } },
        });

        const byTipo: UsageBucket[] = grouped.map((g) => ({
          tipo: g.tipo,
          quantity: Number(g._sum.quantity ?? 0),
          totalCostUsd: Number(g._sum.totalCostUsd ?? 0),
        }));

        const totalCostUsd = byTipo.reduce((s, b) => s + b.totalCostUsd, 0);

        return { windowLabel: win.label, totalCostUsd, byTipo };
      }),
    );

    return buckets;
  });
}

export async function listRecentUsageRecords(activeTenantId: string, limit = 50) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.usageRecord.findMany({
      orderBy: [{ recordedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        tipo: true,
        quantity: true,
        unitCostUsd: true,
        totalCostUsd: true,
        recordedAt: true,
        conversationId: true,
        agentId: true,
      },
    }),
  );
}
