/**
 * Registry de verticais. Cada vertical tem defaults pra workflows, limites,
 * situações críticas, transferência humana, etc — pra acelerar o onboarding
 * de agentes do segmento sem precisar configurar tudo do zero.
 *
 * `comercial-b2b`: distribuição, indústria, serviços corporativos
 * `suporte-pos-venda`: atendimento de chamados, defeitos, troca, garantia
 * `recepcao`: clínicas, escritórios, hotéis, salões — agendamento e info
 * `varejo-b2c`: lojas online/físicas — produto, pedido, pagamento
 * `cobranca`: boletos, parcelamento, comprovantes (LGPD/CDC sensíveis)
 * `educacao`: escolas, cursos, idiomas — matrícula, calendário, mensalidade
 *
 * `custom`: legacy escape hatch (NÃO mostrado na UI atual).
 */
import type { Vertical } from "../../draft-state-schema";
import type { VerticalDefaults } from "../vertical-types";
import { cobrancaDefaults } from "./cobranca";
import { comercialB2BDefaults } from "./comercial-b2b";
import { educacaoDefaults } from "./educacao";
import { recepcaoDefaults } from "./recepcao";
import { suportePosVendaDefaults } from "./suporte-pos-venda";
import { varejoB2CDefaults } from "./varejo-b2c";

const REGISTRY: Partial<Record<Vertical, VerticalDefaults>> = {
  "comercial-b2b": comercialB2BDefaults,
  "suporte-pos-venda": suportePosVendaDefaults,
  recepcao: recepcaoDefaults,
  "varejo-b2c": varejoB2CDefaults,
  cobranca: cobrancaDefaults,
  educacao: educacaoDefaults,
};

export function getVerticalDefaults(vertical: Vertical): VerticalDefaults {
  // Fallback: vertical não implementado (custom legacy) usa comercial-b2b.
  return REGISTRY[vertical] ?? comercialB2BDefaults;
}

export const VERTICAL_LABELS: Record<Vertical, string> = {
  "comercial-b2b": "Comercial B2B",
  "suporte-pos-venda": "Suporte / Pós-venda",
  recepcao: "Recepção / Agendamento",
  "varejo-b2c": "Varejo B2C / E-commerce",
  cobranca: "Cobrança",
  educacao: "Educação",
  custom: "Customizado (prompt manual)",
};

export const VERTICAL_OPTIONS: Array<{
  value: Vertical;
  label: string;
  description: string;
  soon?: boolean;
}> = [
  {
    value: "comercial-b2b",
    label: "Comercial B2B",
    description: "Distribuidor, atacado, indústria — cotação, pedido, 2ª via, reclamação",
  },
  {
    value: "suporte-pos-venda",
    label: "Suporte / Pós-venda",
    description: "Chamados, defeitos, troca, garantia, instalação",
  },
  {
    value: "recepcao",
    label: "Recepção / Agendamento",
    description: "Clínicas, escritórios, hotéis, salões — marcar, reagendar, informar",
  },
  {
    value: "varejo-b2c",
    label: "Varejo B2C / E-commerce",
    description: "Lojas online ou físicas — produto, pedido, pagamento",
  },
  {
    value: "cobranca",
    label: "Cobrança",
    description: "Boletos, parcelamento, comprovantes — tom respeitoso e dentro da lei",
  },
  {
    value: "educacao",
    label: "Educação",
    description: "Escolas, cursos livres, idiomas, EAD — matrícula, calendário, mensalidade",
  },
];
