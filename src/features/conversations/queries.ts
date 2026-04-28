import { withTenantContext } from "@/lib/db/tenant-context";

/**
 * Lista conversations do tenant ativo, mais recentes primeiro. V1 sem
 * paginação UI — limit fixo. Filtros + paginação ficam pra V1.5 quando
 * volume justificar.
 */
export async function listConversations(activeTenantId: string, limit = 100) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.conversation.findMany({
      orderBy: [{ startedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        status: true,
        durationSeconds: true,
        customerIdentifier: true,
        summary: true,
        assistanceMode: true,
        channel: { select: { id: true, tipo: true, nomeAmigavel: true } },
        currentAgent: { select: { id: true, nome: true } },
        currentDepartment: { select: { id: true, nome: true } },
      },
    }),
  );
}

export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];

/**
 * Detail completo de uma conversation: core + sub-tables (voice/email/wa) +
 * turns ordenados por timestamp + agent history + interventions.
 */
export async function getConversationDetail(activeTenantId: string, id: string) {
  return withTenantContext(activeTenantId, (tx) =>
    tx.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        status: true,
        durationSeconds: true,
        costUsdTotal: true,
        customerIdentifier: true,
        customerMetadata: true,
        summary: true,
        languageDetected: true,
        assistanceMode: true,
        tags: true,
        channel: { select: { id: true, tipo: true, nomeAmigavel: true, identificador: true } },
        currentAgent: { select: { id: true, nome: true } },
        currentDepartment: { select: { id: true, nome: true } },
        voiceData: true,
        emailData: true,
        whatsappData: true,
        turns: {
          orderBy: [{ timestamp: "asc" }],
          select: {
            id: true,
            speaker: true,
            contentText: true,
            contentAudioRef: true,
            timestamp: true,
            latencyMs: true,
            toolCall: true,
            toolResult: true,
            tokensIn: true,
            tokensOut: true,
            actorAccount: { select: { id: true, nome: true } },
          },
        },
        agentHistory: {
          orderBy: [{ at: "asc" }],
          select: {
            id: true,
            at: true,
            reason: true,
            fromAgent: { select: { nome: true } },
            toAgent: { select: { nome: true } },
          },
        },
        interventions: {
          orderBy: [{ startedAt: "asc" }],
          select: {
            id: true,
            modeEntered: true,
            startedAt: true,
            endedAt: true,
            reason: true,
            operatorAccount: { select: { id: true, nome: true } },
          },
        },
      },
    }),
  );
}

export type ConversationDetail = NonNullable<Awaited<ReturnType<typeof getConversationDetail>>>;
