/**
 * Cria/atualiza um Channel `voice_did` + RoutingRule `direct` mapeando
 * uma extensão (DID ou número interno) pra um Agent específico.
 *
 * Substitui (até a UI de Channels existir) o caminho oficial de criação
 * de canal pelo portal. Idempotente — re-rodar com mesmo (tenantSlug,
 * extension) atualiza target_agent_id pra apontar pro novo agente.
 *
 * Uso:
 *   pnpm tsx scripts/seed-test-channel.ts <tenantSlug> <agentId> <extension>
 *
 * Exemplo:
 *   pnpm tsx scripts/seed-test-channel.ts pekiart-teste-of3wtxab \
 *     019dd66b-ba44-71fe-ab0e-2b987ac4c3de 9999
 */
import { prismaAdmin } from "../src/lib/db/admin-client";

async function main() {
  const [, , tenantSlug, agentId, extension] = process.argv;
  if (!tenantSlug || !agentId || !extension) {
    console.error("Uso: pnpm tsx scripts/seed-test-channel.ts <tenantSlug> <agentId> <extension>");
    process.exit(1);
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, nomeFantasia: true },
  });
  if (!tenant) throw new Error(`Tenant '${tenantSlug}' não encontrado.`);

  const agent = await prismaAdmin.agent.findUnique({
    where: { id: agentId },
    select: { id: true, nome: true, tenantId: true, currentVersionId: true },
  });
  if (!agent) throw new Error(`Agent '${agentId}' não encontrado.`);
  if (agent.tenantId !== tenant.id) {
    throw new Error(`Agent pertence a outro tenant (${agent.tenantId}).`);
  }
  if (!agent.currentVersionId) {
    throw new Error(
      `Agent '${agent.nome}' ainda não tem versão publicada — bridge não vai conseguir resolver. Publica primeiro.`,
    );
  }

  // Idempotência: se o channel já existe, reusa. O Prisma upsert aqui não
  // bate certo porque defaultRoutingRuleId entra em segundo passo (FK
  // circular Channel.defaultRoutingRuleId → RoutingRule.channelId).
  let channel = await prismaAdmin.channel.findUnique({
    where: {
      tenantId_tipo_identificador: {
        tenantId: tenant.id,
        tipo: "voice_did",
        identificador: extension,
      },
    },
  });
  if (!channel) {
    channel = await prismaAdmin.channel.create({
      data: {
        tenantId: tenant.id,
        tipo: "voice_did",
        identificador: extension,
        nomeAmigavel: `Teste ${extension}`,
        status: "active",
      },
    });
    console.log(`✓ Channel criado: ${channel.id} (${extension})`);
  } else {
    console.log(`✓ Channel já existia: ${channel.id} (${extension})`);
  }

  // Tenta achar uma routing rule existente apontando pra esse channel +
  // agente. Senão cria. Se existir mas pra outro agente, atualiza.
  let rule = await prismaAdmin.routingRule.findFirst({
    where: { channelId: channel.id, tipo: "direct" },
  });
  if (!rule) {
    rule = await prismaAdmin.routingRule.create({
      data: {
        tenantId: tenant.id,
        channelId: channel.id,
        tipo: "direct",
        targetAgentId: agent.id,
      },
    });
    console.log(`✓ RoutingRule criada: ${rule.id} → agent ${agent.nome}`);
  } else if (rule.targetAgentId !== agent.id) {
    rule = await prismaAdmin.routingRule.update({
      where: { id: rule.id },
      data: { targetAgentId: agent.id, targetDepartmentId: null, targetRoutingRuleId: null },
    });
    console.log(`✓ RoutingRule atualizada: ${rule.id} → agent ${agent.nome}`);
  } else {
    console.log(`✓ RoutingRule já apontava pro agente correto: ${rule.id}`);
  }

  if (channel.defaultRoutingRuleId !== rule.id) {
    await prismaAdmin.channel.update({
      where: { id: channel.id },
      data: { defaultRoutingRuleId: rule.id },
    });
    console.log(`✓ Channel.defaultRoutingRuleId = ${rule.id}`);
  }

  console.log(`\nPronto. Bridge agora resolve (${tenantSlug}, ${extension}) → ${agent.nome}`);
  console.log(`  agent.currentVersionId: ${agent.currentVersionId}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
