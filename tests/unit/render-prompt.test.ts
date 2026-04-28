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

    // Ancoras sanity (texto chave de cada bloco)
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
