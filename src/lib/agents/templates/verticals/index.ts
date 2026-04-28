/**
 * Registry de verticais. `getVerticalDefaults("comercial-b2b")` → defaults.
 *
 * Outros verticais (suporte-pos-venda, recepcao, varejo-b2c) ficam pra
 * próximas iterações — por enquanto fallback pra comercial-b2b.
 */
import type { Vertical } from "../../draft-state-schema";
import type { VerticalDefaults } from "../vertical-types";
import { comercialB2BDefaults } from "./comercial-b2b";

const REGISTRY: Partial<Record<Vertical, VerticalDefaults>> = {
  "comercial-b2b": comercialB2BDefaults,
};

export function getVerticalDefaults(vertical: Vertical): VerticalDefaults {
  // Fallback: vertical não implementado usa comercial-b2b.
  return REGISTRY[vertical] ?? comercialB2BDefaults;
}

export const VERTICAL_LABELS: Record<Vertical, string> = {
  "comercial-b2b": "Comercial B2B",
  "suporte-pos-venda": "Suporte / Pós-venda (em breve)",
  recepcao: "Recepção / Agendamento (em breve)",
  "varejo-b2c": "Varejo B2C / E-commerce (em breve)",
  custom: "Customizado (prompt manual)",
};

export const VERTICAL_OPTIONS: Array<{ value: Vertical; label: string; soon?: boolean }> = [
  { value: "comercial-b2b", label: "Comercial B2B" },
  { value: "suporte-pos-venda", label: "Suporte / Pós-venda", soon: true },
  { value: "recepcao", label: "Recepção / Agendamento", soon: true },
  { value: "varejo-b2c", label: "Varejo B2C / E-commerce", soon: true },
  { value: "custom", label: "Customizado (prompt manual)" },
];
