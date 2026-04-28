/**
 * Builders de fixtures pros testes. Tudo via asMigrator (BYPASSRLS) pra que
 * factory sirva pros dois lados (cria registros de tenant A E tenant B sem
 * precisar trocar de contexto).
 *
 * Convencoes:
 *   - emails / slugs sempre unicos (UUID embutido) -- evita colisao em
 *     reuso de container entre test files.
 *   - retorna o registro completo do Prisma, sem omissao, pra teste poder
 *     usar campos derivados (id, createdAt).
 */

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

import { asMigrator } from "./tenants";

export interface MakeAccountOverrides {
  email?: string;
  nome?: string;
  passwordHash?: string;
}

export async function makeAccount(overrides: MakeAccountOverrides = {}): Promise<Account> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.account.create({
      data: {
        email: overrides.email ?? `acc-${id}@test.local`,
        nome: overrides.nome ?? `Account ${id.slice(0, 8)}`,
        passwordHash: overrides.passwordHash ?? "argon2id$placeholder",
      },
    }),
  );
}

export interface MakeTenantOverrides {
  slug?: string;
  nomeFantasia?: string;
}

export async function makeTenant(overrides: MakeTenantOverrides = {}): Promise<Tenant> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.tenant.create({
      data: {
        slug: overrides.slug ?? `tenant-${id.slice(0, 12)}`,
        nomeFantasia: overrides.nomeFantasia ?? `Tenant ${id.slice(0, 8)}`,
      },
    }),
  );
}

export interface MakeMembershipInput {
  tenantId: string;
  accountId: string;
  role?: "tenant_owner" | "tenant_admin" | "department_supervisor" | "operator" | "auditor";
  status?: "invited" | "active" | "disabled";
}

export async function makeMembership(input: MakeMembershipInput): Promise<TenantMembership> {
  return asMigrator((tx) =>
    tx.tenantMembership.create({
      data: {
        tenantId: input.tenantId,
        accountId: input.accountId,
        globalRole: input.role ?? "tenant_admin",
        status: input.status ?? "active",
        joinedAt: new Date(),
      },
    }),
  );
}

export interface MakeDepartmentInput {
  tenantId: string;
  slug?: string;
  nome?: string;
}

export async function makeDepartment(input: MakeDepartmentInput): Promise<Department> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.department.create({
      data: {
        tenantId: input.tenantId,
        slug: input.slug ?? `dept-${id.slice(0, 12)}`,
        nome: input.nome ?? `Department ${id.slice(0, 8)}`,
      },
    }),
  );
}

export interface MakeAgentInput {
  tenantId: string;
  departmentId: string;
  slug?: string;
  nome?: string;
  status?: "draft" | "testing" | "production" | "paused";
}

export async function makeAgent(input: MakeAgentInput): Promise<Agent> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.agent.create({
      data: {
        tenantId: input.tenantId,
        departmentId: input.departmentId,
        slug: input.slug ?? `agent-${id.slice(0, 12)}`,
        nome: input.nome ?? `Agent ${id.slice(0, 8)}`,
        status: input.status ?? "draft",
      },
    }),
  );
}

export interface MakeAgentVersionInput {
  agentId: string;
  tenantId: string;
  version?: number;
  systemPrompt?: string;
  publishedByAccountId?: string;
}

export async function makeAgentVersion(input: MakeAgentVersionInput): Promise<AgentVersion> {
  return asMigrator((tx) =>
    tx.agentVersion.create({
      data: {
        agentId: input.agentId,
        tenantId: input.tenantId,
        version: input.version ?? 1,
        systemPrompt: input.systemPrompt ?? "You are a test agent.",
        params: {},
        toolsSnapshot: {},
        knowledgeSnapshot: {},
        publishedByAccountId: input.publishedByAccountId ?? null,
      },
    }),
  );
}

export interface MakeAuditLogInput {
  tenantId: string;
  accountId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
}

export async function makeAuditLog(input: MakeAuditLogInput): Promise<AuditLog> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        accountId: input.accountId ?? null,
        action: input.action ?? "test.create",
        entityType: input.entityType ?? "test",
        entityId: input.entityId ?? id,
      },
    }),
  );
}

export interface MakeChannelInput {
  tenantId: string;
  tipo?: "voice_did" | "whatsapp" | "email" | "webchat";
  identificador?: string;
  nomeAmigavel?: string;
}

export async function makeChannel(input: MakeChannelInput): Promise<Channel> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.channel.create({
      data: {
        tenantId: input.tenantId,
        tipo: input.tipo ?? "voice_did",
        identificador: input.identificador ?? `chan-${id.slice(0, 12)}`,
        nomeAmigavel: input.nomeAmigavel ?? `Channel ${id.slice(0, 8)}`,
      },
    }),
  );
}

export interface MakeRoutingRuleInput {
  tenantId: string;
  channelId: string;
  /** Exatamente UM dos targets deve ser passado (XOR no DB). */
  targetDepartmentId?: string;
  targetAgentId?: string;
  targetRoutingRuleId?: string;
}

export async function makeRoutingRule(input: MakeRoutingRuleInput): Promise<RoutingRule> {
  return asMigrator((tx) =>
    tx.routingRule.create({
      data: {
        tenantId: input.tenantId,
        channelId: input.channelId,
        tipo: "direct",
        targetDepartmentId: input.targetDepartmentId ?? null,
        targetAgentId: input.targetAgentId ?? null,
        targetRoutingRuleId: input.targetRoutingRuleId ?? null,
      },
    }),
  );
}

export interface MakeKnowledgeSourceInput {
  tenantId: string;
  scope?: "tenant" | "department" | "agent";
  scopeRefId?: string;
  tipo?: "manual_text" | "upload_pdf" | "url_crawl";
  nome?: string;
}

export async function makeKnowledgeSource(
  input: MakeKnowledgeSourceInput,
): Promise<KnowledgeSource> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.knowledgeSource.create({
      data: {
        tenantId: input.tenantId,
        scope: input.scope ?? "tenant",
        scopeRefId: input.scopeRefId ?? null,
        tipo: input.tipo ?? "manual_text",
        nome: input.nome ?? `Knowledge ${id.slice(0, 8)}`,
      },
    }),
  );
}

export interface MakeAgentKnowledgeInput {
  tenantId: string;
  agentId: string;
  knowledgeSourceId: string;
}

export async function makeAgentKnowledge(input: MakeAgentKnowledgeInput): Promise<AgentKnowledge> {
  return asMigrator((tx) =>
    tx.agentKnowledge.create({
      data: {
        tenantId: input.tenantId,
        agentId: input.agentId,
        knowledgeSourceId: input.knowledgeSourceId,
      },
    }),
  );
}

export interface MakeAgentToolInput {
  tenantId: string;
  agentId: string;
  toolKey?: string;
}

export async function makeAgentTool(input: MakeAgentToolInput): Promise<AgentTool> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.agentTool.create({
      data: {
        tenantId: input.tenantId,
        agentId: input.agentId,
        toolKey: input.toolKey ?? `tool_${id.slice(0, 8)}`,
      },
    }),
  );
}

export interface MakeMessageTemplateInput {
  tenantId: string;
  scope?: "tenant" | "department" | "channel" | "routing_rule" | "agent";
  scopeRefId?: string;
  key?: string;
  locale?: string;
  content?: string;
}

export async function makeMessageTemplate(
  input: MakeMessageTemplateInput,
): Promise<MessageTemplate> {
  const id = crypto.randomUUID();
  return asMigrator((tx) =>
    tx.messageTemplate.create({
      data: {
        tenantId: input.tenantId,
        scope: input.scope ?? "tenant",
        scopeRefId: input.scopeRefId ?? null,
        key: input.key ?? `template_${id.slice(0, 8)}`,
        locale: input.locale ?? "pt-BR",
        content: input.content ?? "Olá!",
      },
    }),
  );
}
