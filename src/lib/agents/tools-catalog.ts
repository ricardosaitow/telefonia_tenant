/**
 * Catálogo estático de tools que um Agent pode habilitar (Ontologia §9).
 *
 * Cada tool tem metadados que VÃO PRO PROMPT — o cliente final do tenant
 * NÃO escreve descrição da tool, apenas habilita/desabilita via checkbox.
 * Aqui mora a "documentação" que o LLM lê pra saber quando invocar.
 *
 * Mantenha labels e exemplos em pt-BR — o agente fala pt-BR por default.
 *
 * `requiresIntegration`: tools que dependem de integração externa (ERP/CRM)
 * só funcionam se o tenant tiver a integração correspondente conectada.
 * UI deve grayed-out essas tools com tooltip "requer Integração X".
 *
 * Adicionar tool nova aqui = aparece automaticamente no wizard como opção.
 * Implementação real da tool (handler) vive em outro arquivo (`tools-runtime.ts`,
 * a criar quando o data plane consumir).
 */

export type ToolKey =
  | "consultar_produto"
  | "consultar_pedido"
  | "consultar_2via_boleto"
  | "abrir_chamado"
  | "enviar_email"
  | "agendar_visita"
  | "transferir_humano"
  | "transferir_departamento";

export type ToolMetadata = {
  key: ToolKey;
  /** Label mostrado no wizard (UI). */
  label: string;
  /** Categoria pra agrupar no wizard ("informação", "ação", "escalação"). */
  category: "informacao" | "acao" | "escalacao";
  /** Descrição curta exibida ao usuário no wizard (1 linha). */
  descricaoCurta: string;
  /** Texto que vai pro system prompt: "use quando ...". */
  criterioUso: string;
  /** Exemplo concreto que vai pro system prompt. */
  exemplo: string;
  /** Se requer Integration (ERP/CRM/etc) conectada pra funcionar. */
  requiresIntegration: "erp" | "crm" | "smtp" | "calendar" | null;
};

export const TOOLS_CATALOG: Record<ToolKey, ToolMetadata> = {
  consultar_produto: {
    key: "consultar_produto",
    label: "Consultar produto",
    category: "informacao",
    descricaoCurta: "Busca produto no catálogo (nome, código, especificações, preço).",
    criterioUso:
      "Cliente perguntou sobre disponibilidade, preço, especificações ou características de produto. NUNCA invente — sempre consulte.",
    exemplo:
      "Cliente: 'vocês têm tinta acrílica 18L?' → consultar_produto({termo: 'tinta acrílica 18L'})",
    requiresIntegration: "erp",
  },
  consultar_pedido: {
    key: "consultar_pedido",
    label: "Consultar pedido",
    category: "informacao",
    descricaoCurta: "Busca status, itens e prazo de pedido por número ou CPF/CNPJ.",
    criterioUso:
      "Cliente perguntou sobre seu pedido (status, prazo, itens). Peça número ou CPF/CNPJ se ainda não foi informado.",
    exemplo: "Cliente: 'qual o status do pedido 12345?' → consultar_pedido({id: '12345'})",
    requiresIntegration: "erp",
  },
  consultar_2via_boleto: {
    key: "consultar_2via_boleto",
    label: "2ª via de boleto",
    category: "acao",
    descricaoCurta: "Busca/gera 2ª via de boleto e envia por email/WhatsApp.",
    criterioUso:
      "Cliente pediu 2ª via de boleto. Confirme CPF/CNPJ e canal de envio (email ou WhatsApp) antes de executar.",
    exemplo:
      "Cliente: 'preciso da 2ª via do boleto' → consultar_2via_boleto({cpfCnpj: '...', canal: 'email'})",
    requiresIntegration: "erp",
  },
  abrir_chamado: {
    key: "abrir_chamado",
    label: "Abrir chamado",
    category: "acao",
    descricaoCurta: "Cria chamado de suporte/manutenção no sistema do cliente.",
    criterioUso:
      "Cliente reportou problema que precisa acompanhamento (defeito, manutenção, suporte técnico). Capture descrição completa antes de abrir.",
    exemplo:
      "Cliente: 'meu produto chegou com defeito' → confirme dados e detalhes → abrir_chamado({tipo: 'defeito', descricao: '...'})",
    requiresIntegration: "crm",
  },
  enviar_email: {
    key: "enviar_email",
    label: "Enviar email",
    category: "acao",
    descricaoCurta: "Envia email transacional pro cliente (cotação, comprovante, info).",
    criterioUso:
      "Cliente pediu pra receber algo por email (cotação, comprovante, instruções). Confirme o email antes de enviar.",
    exemplo:
      "Cliente: 'manda a cotação no meu email' → confirme email → enviar_email({to: '...', assunto: '...', corpo: '...'})",
    requiresIntegration: "smtp",
  },
  agendar_visita: {
    key: "agendar_visita",
    label: "Agendar visita",
    category: "acao",
    descricaoCurta: "Agenda visita técnica/comercial em horário disponível.",
    criterioUso:
      "Cliente pediu pra marcar visita. Sempre proponha 2-3 horários disponíveis antes de confirmar.",
    exemplo:
      "Cliente: 'quero agendar visita do consultor' → consulte agenda → ofereça opções → agendar_visita({data: '...', tipo: '...'})",
    requiresIntegration: "calendar",
  },
  transferir_humano: {
    key: "transferir_humano",
    label: "Transferir pra atendente humano",
    category: "escalacao",
    descricaoCurta: "Encaminha a ligação pra atendente humano disponível.",
    criterioUso:
      "Cliente pediu humano explicitamente, OU está irritado/insatisfeito, OU pergunta fora do seu escopo, OU situação delicada (reclamação grave, problema urgente).",
    exemplo:
      "Cliente: 'quero falar com pessoa' → transferir_humano({motivo: 'pedido do cliente', prioridade: 'normal'})",
    requiresIntegration: null,
  },
  transferir_departamento: {
    key: "transferir_departamento",
    label: "Transferir pra outro departamento",
    category: "escalacao",
    descricaoCurta: "Encaminha pra agente de outro departamento (ex: Suporte → Comercial).",
    criterioUso:
      "Tópico do cliente é de outro departamento. Confirme com cliente antes de transferir.",
    exemplo:
      "Cliente (em Suporte) quer comprar produto novo → transferir_departamento({slug: 'comercial'})",
    requiresIntegration: null,
  },
};

export function listToolsByCategory(): Record<ToolMetadata["category"], ToolMetadata[]> {
  const grouped: Record<ToolMetadata["category"], ToolMetadata[]> = {
    informacao: [],
    acao: [],
    escalacao: [],
  };
  for (const tool of Object.values(TOOLS_CATALOG)) {
    grouped[tool.category].push(tool);
  }
  return grouped;
}

export const TOOL_CATEGORY_LABEL: Record<ToolMetadata["category"], string> = {
  informacao: "Consultas (informação)",
  acao: "Ações (escrita)",
  escalacao: "Escalação (humano/outro departamento)",
};
