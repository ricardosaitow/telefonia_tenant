import { describe, expect, it } from "vitest";

import { renderSystemPrompt } from "@/lib/agents/render-prompt";

describe("renderSystemPrompt", () => {
  const baseInput = {
    agent: { nome: "Helena" },
    tenant: { nomeFantasia: "Verde Pack" },
    knowledge: [],
  };

  it("renderiza vertical comercial-b2b com defaults", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
      },
    });

    // Sem persona.nomePersonagem no draft, usa agent.nome (Helena no fixture).
    expect(result).toContain("Você é Helena");
    expect(result).toContain("Verde Pack");
    expect(result).toContain("# CAPACIDADES (TOOLS)");
    expect(result).toContain("# WORKFLOWS");
    expect(result).toContain("# LIMITES");
    expect(result).toContain("# REGRAS DE COMUNICAÇÃO POR VOZ");

    // Tools recomendadas do vertical entram automaticamente quando user
    // não especifica.
    expect(result).toContain("Consultar produto");
    expect(result).toContain("Transferir pra atendente humano");

    // Sem aspas HTML-encoded.
    expect(result).not.toContain("&#39;");
    expect(result).not.toContain("&amp;");

    // Tamanho razoavel — << 50KB.
    expect(result.length).toBeLessThan(20_000);
  });

  it("inclui knowledge sources quando fornecidas", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: { vertical: "comercial-b2b" },
      knowledge: [
        { nome: "Catálogo 2026", descricao: "Lista de produtos" },
        { nome: "Política de Troca" },
      ],
    });

    expect(result).toContain("Catálogo 2026");
    expect(result).toContain("Lista de produtos");
    expect(result).toContain("Política de Troca");
    expect(result).not.toContain("NÃO tem base de conhecimento");
  });

  it("avisa quando não há knowledge", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: { vertical: "comercial-b2b" },
      knowledge: [],
    });

    expect(result).toContain("NÃO tem base de conhecimento");
  });

  it("user-input sobrescreve defaults do vertical", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        limites: ["nunca xinge o cliente"],
        encerramento: "Foi um prazer falar com você. Bom dia!",
        situacoesCriticas: {
          clienteIrritado: "Custom irritado handler",
        },
      },
    });

    expect(result).toContain("nunca xinge o cliente");
    expect(result).toContain("Foi um prazer falar com você");
    expect(result).toContain("Custom irritado handler");

    // Defaults do vertical NÃO aparecem quando user preencheu.
    expect(result).not.toContain("prometer prazo de entrega sem consultar");
  });

  it("vertical=custom usa systemPromptOverride literal", () => {
    const override = "Esse é meu prompt cru.\nLinha 2.";
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "custom",
        systemPromptOverride: override,
      },
    });

    expect(result).toBe(override);
  });

  it("legacy: agent antigo com systemPrompt direto não quebra", () => {
    const legacy = "Sou um agente antigo, não tenho schema novo.";
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: { systemPrompt: legacy },
    });

    expect(result).toBe(legacy);
  });

  it("custom sem override lança erro", () => {
    expect(() =>
      renderSystemPrompt({
        ...baseInput,
        draftState: { vertical: "custom" },
      }),
    ).toThrow("draft_invalid_system_prompt");
  });

  it("persona.nomePersonagem sobrescreve agent.nome na linha de identidade", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        persona: { nomePersonagem: "Sofia" },
      },
    });
    expect(result).toContain("Você é Sofia");
    expect(result).not.toContain("Você é Helena");
  });

  it("traits são usadas no bloco persona", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        persona: {
          tom: "casual",
          energia: "animada",
          traits: ["empatica", "divertida"],
        },
      },
    });

    expect(result).toContain("Próximo, conversacional");
    expect(result).toContain("Animada e proativa");
    expect(result).toContain("empática");
    expect(result).toContain("leve e divertida");
  });

  it("tratamento muda label no bloco IDIOMA E TRATAMENTO", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        persona: { tratamento: "senhor_senhora" },
      },
    });
    expect(result).toContain("# IDIOMA E TRATAMENTO");
    expect(result).toContain('"senhor/senhora"');
  });

  it("autoIdentificacao=nega gera bloco de desvio", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        persona: { autoIdentificacao: "nega" },
      },
    });
    expect(result).toContain("# AUTO-IDENTIFICAÇÃO");
    expect(result).toContain("NUNCA confirme nem negue");
  });

  it("autoIdentificacao=assume_ia confirma com naturalidade", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        persona: { autoIdentificacao: "assume_ia" },
      },
    });
    expect(result).toContain("Você é uma assistente virtual (IA)");
  });

  it("dados institucionais NÃO entram no prompt mesmo se ainda no draft (legacy)", () => {
    // Drafts antigos podem ter empresa/glossario/identity. Renderer ignora —
    // info da empresa agora vai EXCLUSIVAMENTE via knowledge.
    const result = renderSystemPrompt({
      ...baseInput,
      // Campos legacy (glossario, identity, empresa) ignorados pelo Zod
      // — não existem mais no schema. Renderer não emite blocos pra eles.
      draftState: {
        vertical: "comercial-b2b",
        glossario: [{ termo: "OS", significado: "Ordem de Serviço" }],
        identity: { descricaoCurta: "lead descriptivo" },
        empresa: { segmento: "B2B distribuição", horarioComercial: "Seg-Sex 8-18" },
      },
    });
    expect(result).not.toContain("# GLOSSÁRIO INTERNO");
    expect(result).not.toContain("**OS**");
    expect(result).not.toContain("Ordem de Serviço");
    expect(result).not.toContain("# A EMPRESA");
    expect(result).not.toContain("B2B distribuição");
    expect(result).not.toContain("lead descriptivo");
  });

  it("saudação personalizada substitui default por horário", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        comportamento: {
          saudacaoInicial: "Helena, da Verde Pack. Como posso ajudar?",
        },
      },
    });
    expect(result).toContain("# SAUDAÇÃO INICIAL");
    expect(result).toContain("Helena, da Verde Pack. Como posso ajudar?");
    expect(result).not.toContain("[bom dia até 12h");
  });

  it("identificacaoCliente=full pede nome+CPF+contato", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        comportamento: { identificacaoCliente: "full" },
      },
    });
    expect(result).toContain("# IDENTIFICAÇÃO DO CLIENTE");
    expect(result).toContain("nome completo + CPF/CNPJ + email/telefone");
  });

  it("identificacaoCliente=none não gera bloco", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        comportamento: { identificacaoCliente: "none" },
      },
    });
    expect(result).not.toContain("# IDENTIFICAÇÃO DO CLIENTE");
  });

  it("restricoes de linguagem entram em LIMITES junto com nuncas", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        limites: ["nunca prometa prazo"],
        comportamento: {
          restricoesLinguagem: ["nunca usar 'querida' ou 'amor'", "evitar gírias"],
        },
      },
    });
    expect(result).toContain("nunca prometa prazo");
    expect(result).toContain("nunca usar 'querida' ou 'amor'");
    expect(result).toContain("evitar gírias");
  });

  it("lgpdPolicy gera bloco PRIVACIDADE / LGPD", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        comportamento: {
          lgpdPolicy: "Política custom: confirme nome + CPF antes de qualquer info de cadastro.",
        },
      },
    });
    expect(result).toContain("# PRIVACIDADE / LGPD");
    expect(result).toContain("Política custom");
  });

  it("comercial-b2b usa lgpdPolicy default quando user não preenche", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: { vertical: "comercial-b2b" },
    });
    expect(result).toContain("# PRIVACIDADE / LGPD");
    expect(result).toContain("PRÓPRIO cliente que está na ligação");
  });

  it("workflows desabilitados não vão pro prompt", () => {
    const result = renderSystemPrompt({
      ...baseInput,
      draftState: {
        vertical: "comercial-b2b",
        workflows: [
          {
            titulo: "Workflow ativo",
            gatilho: "gatilho ativo",
            passos: "passos ativos",
            enabled: true,
          },
          {
            titulo: "Workflow desabilitado",
            gatilho: "ignorado",
            passos: "ignorado",
            enabled: false,
          },
        ],
      },
    });

    expect(result).toContain("Workflow ativo");
    expect(result).not.toContain("Workflow desabilitado");
  });
});
