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
 *   - routing_rules      (RLS no `tenant_id`)
 *   - knowledge_sources  (RLS no `tenant_id`)
 *   - agent_knowledge    (RLS no `tenant_id` denormalizado)
 *   - agent_tools        (RLS no `tenant_id`)
 *   - message_templates  (RLS no `tenant_id`)
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
  Department,
  KnowledgeSource,
  MessageTemplate,
  RoutingRule,
  Tenant,
  TenantMembership,
} from "@/generated/prisma/client";

import {
  makeAccount,
  makeAgent,
  makeAgentKnowledge,
  makeAgentTool,
  makeAgentVersion,
  makeAuditLog,
  makeChannel,
  makeDepartment,
  makeKnowledgeSource,
  makeMembership,
  makeMessageTemplate,
  makeRoutingRule,
  makeTenant,
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
let routingRuleA: RoutingRule;
let knowledgeSourceA: KnowledgeSource;
let agentKnowledgeA: AgentKnowledge;
let agentToolA: AgentTool;
let messageTemplateA: MessageTemplate;

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
});

afterAll(async () => {
  // Limpa pra nao poluir runs subsequentes do mesmo container.
  // Ordem FK (filhos primeiro): message_templates, agent_tools, agent_knowledge
  //         -> knowledge_sources -> routing_rules -> audit_logs -> agent_versions
  //         -> agents -> departments -> channels -> memberships -> tenants -> accounts.
  await migratorPrisma().$transaction(async (tx) => {
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
    await tx.tenantMembership.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
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
});
