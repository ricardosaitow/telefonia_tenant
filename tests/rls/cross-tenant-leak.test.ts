/**
 * SUITE BLOQUEANTE -- anti-cross-tenant.
 *
 * Invariante: usuario logado em tenant B NUNCA enxerga, atualiza ou apaga
 * registros de tenant A. Validado por Postgres RLS (D002), nao por filtro
 * em codigo.
 *
 * Toda nova model com `tenantId` exige caso aqui (rules/database.md,
 * rules/multi-tenant.md, rules/testing-portal.md). Falha bloqueia merge
 * (`pnpm test:rls` no pre-push hook + verify).
 *
 * Cobertura atual:
 *   - tenants            (RLS no `id`)
 *   - tenant_memberships (RLS no `tenant_id`)
 *   - departments        (RLS no `tenant_id`)
 *   - agents             (RLS no `tenant_id`)
 *   - agent_versions     (RLS no `tenant_id` denormalizado)
 *   - audit_logs         (RLS no `tenant_id`)
 *   - channels           (RLS no `tenant_id`)
 *   - extensions         (RLS no `tenant_id`)
 *   - routing_rules      (RLS no `tenant_id`)

 *   - knowledge_sources  (RLS no `tenant_id`)
 *   - agent_knowledge    (RLS no `tenant_id` denormalizado)
 *   - agent_tools        (RLS no `tenant_id`)
 *   - message_templates  (RLS no `tenant_id`)
 *   - conversations      (RLS no `tenant_id`)
 *   - conversation_voice_data    (RLS no `tenant_id` denormalizado)
 *   - conversation_email_data    (RLS no `tenant_id` denormalizado)
 *   - conversation_whatsapp_data (RLS no `tenant_id` denormalizado)
 *   - conversation_agent_history (RLS no `tenant_id` denormalizado)
 *   - conversation_intervention  (RLS no `tenant_id` denormalizado)
 *   - turns              (RLS no `tenant_id` denormalizado)
 *   - security_events    (RLS no `tenant_id` nullable -- null fica fora pra app_user)
 *   - usage_records      (RLS no `tenant_id`)
 *
 * accounts e GLOBAL (D004) -- NAO tem RLS, nao entra aqui.
 * sessions e per-account, sem tenant_id -- nao entra aqui.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type {
  Account,
  Agent,
  AgentKnowledge,
  AgentTool,
  AgentVersion,
  AuditLog,
  Channel,
  Conversation,
  ConversationAgentHistory,
  ConversationEmailData,
  ConversationIntervention,
  ConversationVoiceData,
  ConversationWhatsappData,
  Department,
  Extension,
  KnowledgeSource,
  MessageTemplate,
  RoutingRule,
  SecurityEvent,
  Tenant,
  TenantMembership,
  Turn,
  UsageRecord,
} from "@/generated/prisma/client";

import {
  makeAccount,
  makeAgent,
  makeAgentKnowledge,
  makeAgentTool,
  makeAgentVersion,
  makeAuditLog,
  makeChannel,
  makeConversation,
  makeConversationAgentHistory,
  makeConversationEmailData,
  makeConversationIntervention,
  makeConversationVoiceData,
  makeConversationWhatsappData,
  makeDepartment,
  makeExtension,
  makeKnowledgeSource,
  makeMembership,
  makeMessageTemplate,
  makeRoutingRule,
  makeSecurityEvent,
  makeTenant,
  makeTurn,
  makeUsageRecord,
} from "../helpers/factories";
import { asTenant } from "../helpers/tenants";
import { appPrisma, migratorPrisma } from "../helpers/test-client";

let tenantA: Tenant;
let tenantB: Tenant;
let accountX: Account;
let accountY: Account;
let membershipAX: TenantMembership;
let departmentA: Department;
let agentA: Agent;
let agentVersionA: AgentVersion;
let auditLogA: AuditLog;
let channelA: Channel;
let extensionA: Extension;
let routingRuleA: RoutingRule;
let knowledgeSourceA: KnowledgeSource;
let agentKnowledgeA: AgentKnowledge;
let agentToolA: AgentTool;
let messageTemplateA: MessageTemplate;
let conversationA: Conversation;
let voiceDataA: ConversationVoiceData;
let emailDataA: ConversationEmailData;
let waDataA: ConversationWhatsappData;
let agentHistoryA: ConversationAgentHistory;
let interventionA: ConversationIntervention;
let turnA: Turn;
let securityEventA: SecurityEvent;
let securityEventGlobal: SecurityEvent;
let usageRecordA: UsageRecord;

beforeAll(async () => {
  // Setup: 2 tenants distintos, 1 account por tenant, membership cruzada.
  // Em A: 1 department + 1 agent + 1 agent version. Tenant B fica vazio
  // (so com membership) -- exatamente o que precisamos pra exercitar
  // todos os "B nao enxerga A".
  tenantA = await makeTenant({ slug: `rls-a-${crypto.randomUUID().slice(0, 8)}` });
  tenantB = await makeTenant({ slug: `rls-b-${crypto.randomUUID().slice(0, 8)}` });
  accountX = await makeAccount();
  accountY = await makeAccount();
  membershipAX = await makeMembership({
    tenantId: tenantA.id,
    accountId: accountX.id,
    role: "tenant_owner",
  });
  await makeMembership({
    tenantId: tenantB.id,
    accountId: accountY.id,
    role: "tenant_owner",
  });

  departmentA = await makeDepartment({ tenantId: tenantA.id });
  agentA = await makeAgent({ tenantId: tenantA.id, departmentId: departmentA.id });
  agentVersionA = await makeAgentVersion({
    agentId: agentA.id,
    tenantId: tenantA.id,
    publishedByAccountId: accountX.id,
  });
  auditLogA = await makeAuditLog({
    tenantId: tenantA.id,
    accountId: accountX.id,
    action: "department.create",
    entityType: "department",
    entityId: departmentA.id,
  });
  channelA = await makeChannel({ tenantId: tenantA.id });
  extensionA = await makeExtension({ tenantId: tenantA.id });
  routingRuleA = await makeRoutingRule({
    tenantId: tenantA.id,
    channelId: channelA.id,
    targetDepartmentId: departmentA.id,
  });
  knowledgeSourceA = await makeKnowledgeSource({ tenantId: tenantA.id });
  agentKnowledgeA = await makeAgentKnowledge({
    tenantId: tenantA.id,
    agentId: agentA.id,
    knowledgeSourceId: knowledgeSourceA.id,
  });
  agentToolA = await makeAgentTool({ tenantId: tenantA.id, agentId: agentA.id });
  messageTemplateA = await makeMessageTemplate({ tenantId: tenantA.id });
  conversationA = await makeConversation({
    tenantId: tenantA.id,
    channelId: channelA.id,
    currentAgentId: agentA.id,
    currentDepartmentId: departmentA.id,
  });
  voiceDataA = await makeConversationVoiceData({
    conversationId: conversationA.id,
    tenantId: tenantA.id,
  });
  // Pra voice/email/wa terem fixtures distintas (cada uma 1:1 por conversation),
  // crio mais 2 conversations dedicadas:
  const convForEmail = await makeConversation({
    tenantId: tenantA.id,
    channelId: channelA.id,
  });
  emailDataA = await makeConversationEmailData({
    conversationId: convForEmail.id,
    tenantId: tenantA.id,
  });
  const convForWa = await makeConversation({
    tenantId: tenantA.id,
    channelId: channelA.id,
  });
  waDataA = await makeConversationWhatsappData({
    conversationId: convForWa.id,
    tenantId: tenantA.id,
  });
  agentHistoryA = await makeConversationAgentHistory({
    conversationId: conversationA.id,
    tenantId: tenantA.id,
    toAgentId: agentA.id,
  });
  interventionA = await makeConversationIntervention({
    conversationId: conversationA.id,
    tenantId: tenantA.id,
    operatorAccountId: accountX.id,
  });
  turnA = await makeTurn({
    conversationId: conversationA.id,
    tenantId: tenantA.id,
  });
  securityEventA = await makeSecurityEvent({
    tenantId: tenantA.id,
    accountId: accountX.id,
    severity: "info",
    category: "authn",
    eventType: "login_success",
  });
  // Evento global (sem tenant) -- p.ex. login fail antes de ter tenant ativo.
  // Deve ser invisível pra QUALQUER app_user (RLS exige tenant_id IS NOT NULL).
  securityEventGlobal = await makeSecurityEvent({
    tenantId: null,
    severity: "low",
    category: "authn",
    eventType: "login_fail",
    description: "Email não cadastrado",
  });
  usageRecordA = await makeUsageRecord({
    tenantId: tenantA.id,
    conversationId: conversationA.id,
    agentId: agentA.id,
    tipo: "gemini_tokens_in",
    quantity: 1234,
    unitCostUsd: 0.0000001,
  });
});

afterAll(async () => {
  // Limpa pra nao poluir runs subsequentes do mesmo container.
  // Ordem FK (filhos primeiro): turns, intervention, agent_history, voice/email/wa data
  //         -> conversations -> message_templates, agent_tools, agent_knowledge
  //         -> knowledge_sources -> routing_rules -> audit_logs -> agent_versions
  //         -> agents -> departments -> channels -> memberships -> tenants -> accounts.
  // (CASCADE da Conversation deleta sub-tables/turns/agent_history/intervention,
  // mas explícito é mais seguro pra ordem.)
  await migratorPrisma().$transaction(async (tx) => {
    await tx.turn.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.conversationIntervention.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.conversationAgentHistory.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.conversationVoiceData.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.conversationEmailData.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.conversationWhatsappData.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.conversation.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.messageTemplate.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await tx.agentTool.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.agentKnowledge.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.knowledgeSource.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.routingRule.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.auditLog.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.agentVersion.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.agent.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.department.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.channel.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.extension.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.usageRecord.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await tx.tenantMembership.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    // SecurityEvent: limpa o global manualmente (não tem tenantId pra cascade);
    // os com tenantId caem via CASCADE quando apagar o tenant.
    await tx.securityEvent.deleteMany({
      where: { id: { in: [securityEventA.id, securityEventGlobal.id] } },
    });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    await tx.account.deleteMany({ where: { id: { in: [accountX.id, accountY.id] } } });
  });
  await appPrisma().$disconnect();
  await migratorPrisma().$disconnect();
});

describe("RLS: tenants", () => {
  it("tenant B nao enxerga o registro do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.tenant.findUnique({ where: { id: tenantA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao lista o tenant A em findMany", async () => {
    const list = await asTenant(tenantB.id, (tx) =>
      tx.tenant.findMany({ where: { id: { in: [tenantA.id, tenantB.id] } } }),
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(tenantB.id);
  });

  it("tenant B nao consegue updateMany registro do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenant.updateMany({
        where: { id: tenantA.id },
        data: { nomeFantasia: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenant.findUnique({ where: { id: tenantA.id } });
    expect(reread?.nomeFantasia).toBe(tenantA.nomeFantasia);
  });

  it("tenant B nao consegue deleteMany registro do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenant.deleteMany({ where: { id: tenantA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenant.findUnique({ where: { id: tenantA.id } });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: tenant_memberships", () => {
  it("tenant B nao enxerga membership do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.findUnique({ where: { id: membershipAX.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao lista memberships do tenant A em findMany", async () => {
    const list = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.findMany({
        where: { tenantId: { in: [tenantA.id, tenantB.id] } },
      }),
    );
    for (const m of list) {
      expect(m.tenantId).toBe(tenantB.id);
    }
  });

  it("tenant B nao consegue updateMany membership do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.updateMany({
        where: { id: membershipAX.id },
        data: { status: "disabled" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenantMembership.findUnique({
      where: { id: membershipAX.id },
    });
    expect(reread?.status).toBe("active");
  });

  it("tenant B nao consegue deleteMany membership do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.tenantMembership.deleteMany({ where: { id: membershipAX.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().tenantMembership.findUnique({
      where: { id: membershipAX.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: departments", () => {
  it("tenant B nao enxerga department do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.department.findUnique({ where: { id: departmentA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany department do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.department.updateMany({
        where: { id: departmentA.id },
        data: { nome: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().department.findUnique({ where: { id: departmentA.id } });
    expect(reread?.nome).toBe(departmentA.nome);
  });

  it("tenant B nao consegue deleteMany department do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.department.deleteMany({ where: { id: departmentA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().department.findUnique({ where: { id: departmentA.id } });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: agents", () => {
  it("tenant B nao enxerga agent do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.agent.findUnique({ where: { id: agentA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany agent do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agent.updateMany({
        where: { id: agentA.id },
        data: { nome: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().agent.findUnique({ where: { id: agentA.id } });
    expect(reread?.nome).toBe(agentA.nome);
  });

  it("tenant B nao consegue deleteMany agent do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agent.deleteMany({ where: { id: agentA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().agent.findUnique({ where: { id: agentA.id } });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: agent_versions", () => {
  it("tenant B nao enxerga agent_version do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.agentVersion.findUnique({ where: { id: agentVersionA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany agent_version do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agentVersion.updateMany({
        where: { id: agentVersionA.id },
        data: { changelog: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().agentVersion.findUnique({
      where: { id: agentVersionA.id },
    });
    expect(reread?.changelog).toBe(agentVersionA.changelog);
  });

  it("tenant B nao consegue deleteMany agent_version do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agentVersion.deleteMany({ where: { id: agentVersionA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().agentVersion.findUnique({
      where: { id: agentVersionA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: audit_logs", () => {
  it("tenant B nao enxerga audit_log do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.auditLog.findUnique({ where: { id: auditLogA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany audit_log do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.auditLog.updateMany({
        where: { id: auditLogA.id },
        data: { action: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().auditLog.findUnique({
      where: { id: auditLogA.id },
    });
    expect(reread?.action).toBe(auditLogA.action);
  });

  it("tenant B nao consegue deleteMany audit_log do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.auditLog.deleteMany({ where: { id: auditLogA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().auditLog.findUnique({
      where: { id: auditLogA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: channels", () => {
  it("tenant B nao enxerga channel do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.channel.findUnique({ where: { id: channelA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany channel do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.channel.updateMany({
        where: { id: channelA.id },
        data: { nomeAmigavel: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().channel.findUnique({ where: { id: channelA.id } });
    expect(reread?.nomeAmigavel).toBe(channelA.nomeAmigavel);
  });

  it("tenant B nao consegue deleteMany channel do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.channel.deleteMany({ where: { id: channelA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().channel.findUnique({ where: { id: channelA.id } });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: extensions", () => {
  it("tenant B nao enxerga extension do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.extension.findUnique({ where: { id: extensionA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao lista extension do tenant A em findMany", async () => {
    const list = await asTenant(tenantB.id, (tx) =>
      tx.extension.findMany({ where: { id: extensionA.id } }),
    );
    expect(list).toEqual([]);
  });

  it("tenant B nao consegue updateMany extension do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.extension.updateMany({
        where: { id: extensionA.id },
        data: { displayName: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().extension.findUnique({
      where: { id: extensionA.id },
    });
    expect(reread?.displayName).toBe(extensionA.displayName);
  });

  it("tenant B nao consegue deleteMany extension do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.extension.deleteMany({ where: { id: extensionA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().extension.findUnique({
      where: { id: extensionA.id },
    });
    expect(reread).not.toBeNull();
  });

  it("tenant A enxerga sua propria extension", async () => {
    const found = await asTenant(tenantA.id, (tx) =>
      tx.extension.findUnique({ where: { id: extensionA.id } }),
    );
    expect(found?.id).toBe(extensionA.id);
  });
});

describe("RLS: routing_rules", () => {
  it("tenant B nao enxerga routing_rule do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.routingRule.findUnique({ where: { id: routingRuleA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany routing_rule do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.routingRule.updateMany({
        where: { id: routingRuleA.id },
        data: { prioridade: 999 },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().routingRule.findUnique({
      where: { id: routingRuleA.id },
    });
    expect(reread?.prioridade).toBe(routingRuleA.prioridade);
  });

  it("tenant B nao consegue deleteMany routing_rule do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.routingRule.deleteMany({ where: { id: routingRuleA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().routingRule.findUnique({
      where: { id: routingRuleA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: knowledge_sources", () => {
  it("tenant B nao enxerga knowledge_source do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.knowledgeSource.findUnique({ where: { id: knowledgeSourceA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany knowledge_source do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.knowledgeSource.updateMany({
        where: { id: knowledgeSourceA.id },
        data: { nome: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().knowledgeSource.findUnique({
      where: { id: knowledgeSourceA.id },
    });
    expect(reread?.nome).toBe(knowledgeSourceA.nome);
  });

  it("tenant B nao consegue deleteMany knowledge_source do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.knowledgeSource.deleteMany({ where: { id: knowledgeSourceA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().knowledgeSource.findUnique({
      where: { id: knowledgeSourceA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: agent_knowledge", () => {
  it("tenant B nao enxerga agent_knowledge do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.agentKnowledge.findFirst({
        where: {
          agentId: agentKnowledgeA.agentId,
          knowledgeSourceId: agentKnowledgeA.knowledgeSourceId,
        },
      }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue deleteMany agent_knowledge do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agentKnowledge.deleteMany({
        where: {
          agentId: agentKnowledgeA.agentId,
          knowledgeSourceId: agentKnowledgeA.knowledgeSourceId,
        },
      }),
    );
    expect(result.count).toBe(0);
  });
});

describe("RLS: agent_tools", () => {
  it("tenant B nao enxerga agent_tool do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.agentTool.findUnique({ where: { id: agentToolA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany agent_tool do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agentTool.updateMany({
        where: { id: agentToolA.id },
        data: { enabled: false },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().agentTool.findUnique({
      where: { id: agentToolA.id },
    });
    expect(reread?.enabled).toBe(agentToolA.enabled);
  });

  it("tenant B nao consegue deleteMany agent_tool do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.agentTool.deleteMany({ where: { id: agentToolA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().agentTool.findUnique({
      where: { id: agentToolA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: message_templates", () => {
  it("tenant B nao enxerga message_template do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.messageTemplate.findUnique({ where: { id: messageTemplateA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany message_template do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.messageTemplate.updateMany({
        where: { id: messageTemplateA.id },
        data: { content: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().messageTemplate.findUnique({
      where: { id: messageTemplateA.id },
    });
    expect(reread?.content).toBe(messageTemplateA.content);
  });

  it("tenant B nao consegue deleteMany message_template do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.messageTemplate.deleteMany({ where: { id: messageTemplateA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().messageTemplate.findUnique({
      where: { id: messageTemplateA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: conversations", () => {
  it("tenant B nao enxerga conversation do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.conversation.findUnique({ where: { id: conversationA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany conversation do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.conversation.updateMany({
        where: { id: conversationA.id },
        data: { summary: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);
  });

  it("tenant B nao consegue deleteMany conversation do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.conversation.deleteMany({ where: { id: conversationA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().conversation.findUnique({
      where: { id: conversationA.id },
    });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: conversation sub-tables (voice/email/whatsapp)", () => {
  it("tenant B nao enxerga voice_data do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.conversationVoiceData.findUnique({ where: { conversationId: voiceDataA.conversationId } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao enxerga email_data do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.conversationEmailData.findUnique({ where: { conversationId: emailDataA.conversationId } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao enxerga whatsapp_data do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.conversationWhatsappData.findUnique({
        where: { conversationId: waDataA.conversationId },
      }),
    );
    expect(found).toBeNull();
  });
});

describe("RLS: conversation_agent_history", () => {
  it("tenant B nao enxerga agent_history do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.conversationAgentHistory.findUnique({ where: { id: agentHistoryA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue deleteMany agent_history do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.conversationAgentHistory.deleteMany({ where: { id: agentHistoryA.id } }),
    );
    expect(result.count).toBe(0);
  });
});

describe("RLS: conversation_intervention", () => {
  it("tenant B nao enxerga intervention do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.conversationIntervention.findUnique({ where: { id: interventionA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue deleteMany intervention do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.conversationIntervention.deleteMany({ where: { id: interventionA.id } }),
    );
    expect(result.count).toBe(0);
  });
});

describe("RLS: turns", () => {
  it("tenant B nao enxerga turn do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.turn.findUnique({ where: { id: turnA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany turn do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.turn.updateMany({
        where: { id: turnA.id },
        data: { contentText: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);
  });

  it("tenant B nao consegue deleteMany turn do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.turn.deleteMany({ where: { id: turnA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().turn.findUnique({ where: { id: turnA.id } });
    expect(reread).not.toBeNull();
  });
});

describe("RLS: security_events", () => {
  it("tenant B nao enxerga security_event do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.securityEvent.findUnique({ where: { id: securityEventA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany security_event do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.securityEvent.updateMany({
        where: { id: securityEventA.id },
        data: { resolutionNote: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().securityEvent.findUnique({
      where: { id: securityEventA.id },
    });
    expect(reread?.resolutionNote).toBeNull();
  });

  it("tenant B nao consegue deleteMany security_event do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.securityEvent.deleteMany({ where: { id: securityEventA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().securityEvent.findUnique({
      where: { id: securityEventA.id },
    });
    expect(reread).not.toBeNull();
  });

  it("tenant A enxerga seu proprio security_event", async () => {
    const found = await asTenant(tenantA.id, (tx) =>
      tx.securityEvent.findUnique({ where: { id: securityEventA.id } }),
    );
    expect(found?.id).toBe(securityEventA.id);
  });

  it("eventos globais (tenant_id NULL) sao invisiveis pra app_user mesmo COM contexto", async () => {
    // RLS exige tenant_id IS NOT NULL na clausula USING. Eventos globais so
    // sao visiveis via prismaAdmin (admin Pekiart). Garantia explicita aqui.
    const fromA = await asTenant(tenantA.id, (tx) =>
      tx.securityEvent.findUnique({ where: { id: securityEventGlobal.id } }),
    );
    expect(fromA).toBeNull();

    const fromB = await asTenant(tenantB.id, (tx) =>
      tx.securityEvent.findUnique({ where: { id: securityEventGlobal.id } }),
    );
    expect(fromB).toBeNull();
  });

  it("admin (migratorPrisma) enxerga eventos globais", async () => {
    const found = await migratorPrisma().securityEvent.findUnique({
      where: { id: securityEventGlobal.id },
    });
    expect(found?.id).toBe(securityEventGlobal.id);
    expect(found?.tenantId).toBeNull();
  });
});

describe("RLS: usage_records", () => {
  it("tenant B nao enxerga usage_record do tenant A", async () => {
    const found = await asTenant(tenantB.id, (tx) =>
      tx.usageRecord.findUnique({ where: { id: usageRecordA.id } }),
    );
    expect(found).toBeNull();
  });

  it("tenant B nao consegue updateMany usage_record do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.usageRecord.updateMany({
        where: { id: usageRecordA.id },
        data: { tipo: "PWNED" },
      }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().usageRecord.findUnique({
      where: { id: usageRecordA.id },
    });
    expect(reread?.tipo).toBe(usageRecordA.tipo);
  });

  it("tenant B nao consegue deleteMany usage_record do tenant A", async () => {
    const result = await asTenant(tenantB.id, (tx) =>
      tx.usageRecord.deleteMany({ where: { id: usageRecordA.id } }),
    );
    expect(result.count).toBe(0);

    const reread = await migratorPrisma().usageRecord.findUnique({
      where: { id: usageRecordA.id },
    });
    expect(reread).not.toBeNull();
  });

  it("tenant A enxerga seu proprio usage_record", async () => {
    const found = await asTenant(tenantA.id, (tx) =>
      tx.usageRecord.findUnique({ where: { id: usageRecordA.id } }),
    );
    expect(found?.id).toBe(usageRecordA.id);
  });
});

describe("RLS: contexto ausente (defesa em profundidade)", () => {
  it("sem app.current_tenant setado, tenants devolve 0 rows", async () => {
    const list = await appPrisma().tenant.findMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, tenant_memberships devolve 0 rows", async () => {
    const list = await appPrisma().tenantMembership.findMany({
      where: { id: membershipAX.id },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, departments devolve 0 rows", async () => {
    const list = await appPrisma().department.findMany({ where: { id: departmentA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, agents devolve 0 rows", async () => {
    const list = await appPrisma().agent.findMany({ where: { id: agentA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, agent_versions devolve 0 rows", async () => {
    const list = await appPrisma().agentVersion.findMany({ where: { id: agentVersionA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, audit_logs devolve 0 rows", async () => {
    const list = await appPrisma().auditLog.findMany({ where: { id: auditLogA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, channels devolve 0 rows", async () => {
    const list = await appPrisma().channel.findMany({ where: { id: channelA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, extensions devolve 0 rows", async () => {
    const list = await appPrisma().extension.findMany({ where: { id: extensionA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, routing_rules devolve 0 rows", async () => {
    const list = await appPrisma().routingRule.findMany({ where: { id: routingRuleA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, knowledge_sources devolve 0 rows", async () => {
    const list = await appPrisma().knowledgeSource.findMany({
      where: { id: knowledgeSourceA.id },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, agent_knowledge devolve 0 rows", async () => {
    const list = await appPrisma().agentKnowledge.findMany({
      where: { agentId: agentKnowledgeA.agentId },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, agent_tools devolve 0 rows", async () => {
    const list = await appPrisma().agentTool.findMany({ where: { id: agentToolA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, message_templates devolve 0 rows", async () => {
    const list = await appPrisma().messageTemplate.findMany({
      where: { id: messageTemplateA.id },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, conversations devolve 0 rows", async () => {
    const list = await appPrisma().conversation.findMany({ where: { id: conversationA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, turns devolve 0 rows", async () => {
    const list = await appPrisma().turn.findMany({ where: { id: turnA.id } });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, security_events devolve 0 rows (incluindo globais)", async () => {
    const list = await appPrisma().securityEvent.findMany({
      where: { id: { in: [securityEventA.id, securityEventGlobal.id] } },
    });
    expect(list).toEqual([]);
  });

  it("sem app.current_tenant setado, usage_records devolve 0 rows", async () => {
    const list = await appPrisma().usageRecord.findMany({ where: { id: usageRecordA.id } });
    expect(list).toEqual([]);
  });
});
