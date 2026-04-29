/**
 * Tipos compartilhados pelos verticais. Cada vertical exporta um
 * `VerticalDefaults` que o renderer mistura com o draftState do user.
 */
import type { ToolKey } from "../tools-catalog";

export type VerticalDefaults = {
  /** Label exibido no select do wizard. */
  label: string;
  /** Descrição curta exibida no select (1 linha). */
  description: string;

  /** Tools recomendadas — wizard pré-marca os checkboxes. */
  recommendedTools: readonly ToolKey[];

  /** Workflows default — cliente pode editar/desabilitar/adicionar. */
  defaultWorkflows: ReadonlyArray<{
    titulo: string;
    gatilho: string;
    passos: string;
    enabled: boolean;
  }>;

  /** Limites padrão pro vertical. Cliente desmarca os que não se aplicam. */
  defaultLimites: readonly string[];

  /** Texto sugerido pra cada situação crítica. */
  defaultSituacoes: {
    clienteIrritado: string;
    urgencia: string;
    foraEscopo: string;
    foraHorario: string;
  };

  /** Critérios padrão de transferência pra humano. */
  defaultTransferenciaCriterios: readonly string[];

  /** Texto padrão de "antes de transferir, faça". */
  defaultPreTransferenciaAcoes: string;

  /** Encerramento padrão. */
  defaultEncerramento: string;

  /** Sugestão de descrição da empresa (lead do prompt). */
  defaultIdentityHint: string;

  /** Saudação padrão (vazio = template usa "Boa [horário]" automático). */
  defaultSaudacaoInicial: string;

  /** Política LGPD padrão pra orientar agente sobre dados de outros clientes. */
  defaultLgpdPolicy: string;

  /** Placeholders pra cada campo de empresa (UI só). */
  placeholders: {
    segmento: string;
    publicoAlvo: string;
    diferenciais: string;
    horarioComercial: string;
  };
};
