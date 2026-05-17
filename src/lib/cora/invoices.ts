/**
 * Cora Invoices — criação de cobrança Pix (com QR Code).
 *
 * Endpoint: POST /v2/invoices (parceria) ou /v2/invoices/ (direta).
 * Doc oficial não expõe schema completo do response; usamos tipos parciais
 * e validamos com response real (logado no primeiro call).
 *
 * Para simular pagamento em stage: POST /v2/invoices/pay com {id}.
 */
import { randomUUID } from "node:crypto";

import { coraRequest } from "./client";

export type CoraPaymentForm = "PIX" | "BANK_SLIP";

export interface CoraCustomerInput {
  /** Nome ou razão social. */
  name: string;
  /** Email do pagador. */
  email?: string;
  /** CPF ou CNPJ (só dígitos). */
  document: { identity: string; type: "CPF" | "CNPJ"; rfb_type?: string };
  address?: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string; // UF 2 chars
    postal_code: string;
    complement?: string;
  };
}

export interface CoraServiceInput {
  /** Nome curto do serviço. */
  name: string;
  /** Descrição livre. */
  description?: string;
  /** Valor em centavos (inteiro). */
  amount: number;
}

export interface CreatePixInvoiceInput {
  customer: CoraCustomerInput;
  services: CoraServiceInput[];
  /** Data de vencimento ISO `YYYY-MM-DD`. */
  dueDate: string;
  /** Default ['PIX']. Boleto+Pix combinado: ['BANK_SLIP', 'PIX']. */
  paymentForms?: CoraPaymentForm[];
  /** Metadado interno (não enviado pra Cora — gravado no nosso DB). */
  tenantId?: string;
}

/**
 * Response real do POST /v2/invoices/ — schema confirmado via curl em
 * 2026-05-17. Em stage `payment_options.bank_slip.registered=false` porque
 * CIP não roda em stage; em prod registra e `pix.emv` popula.
 */
export type CoraInvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "EXPIRED" | "CANCELED";

export interface CoraInvoiceResponse {
  id: string; // ex "inv_RJ4A2BNrSUibwGpMOyfJ0g"
  status: CoraInvoiceStatus;
  created_at: string; // ISO
  total_amount: number; // cents
  total_paid: number; // cents (0 até paid)
  occurrence_date: string | null;
  code: string | null;
  customer: {
    name: string;
    email: string | null;
    telephone: string | null;
    document: { identity: string; type: "CPF" | "CNPJ" };
    address: unknown | null;
    code: string | null;
  };
  services: Array<{
    name: string;
    description: string | null;
    amount: number;
    unit: "AMOUNT" | "PERCENTAGE";
    quantity: number | null;
    total_amount: number | null;
    code: string | null;
  }>;
  payment_terms: {
    due_date: string; // YYYY-MM-DD
    fine: unknown | null;
    interest: unknown | null;
    discount: unknown | null;
  };
  payment_options: {
    bank_slip?: {
      barcode: string;
      digitable: string;
      our_number: string;
      registered: boolean;
      url: string | null;
    };
    pix?: unknown;
  };
  payments: Array<{
    id: string;
    status: "IN_PROCESS" | "FINALIZED" | string;
    created_at: string;
    finalized_at: string | null;
    total_paid: number;
    method: "BANK_SLIP" | "PIX" | string;
    order: number;
    interest: number;
    fine: number;
  }>;
  pix: {
    /** BR code "copia-e-cola" do Pix. NULL enquanto invoice DRAFT/sem CIP. */
    emv: string | null;
  };
  /** Index aberto pra campos futuros. */
  [key: string]: unknown;
}

/**
 * Cria invoice com pagamento via Pix QR Code.
 *
 * `Idempotency-Key`: usar tenantId+timestamp pra deduplicar retries
 * (Cora exige header pra evitar duplicar cobrança em retry de rede).
 */
export async function createPixInvoice(input: CreatePixInvoiceInput): Promise<CoraInvoiceResponse> {
  const paymentForms = input.paymentForms ?? ["PIX"];
  const body = {
    customer: input.customer,
    services: input.services,
    payment_terms: { due_date: input.dueDate },
    payment_forms: paymentForms,
  };
  return coraRequest<CoraInvoiceResponse>("/v2/invoices/", {
    method: "POST",
    body,
    idempotencyKey: randomUUID(),
  });
}

/**
 * Simula pagamento de uma invoice no ambiente stage. Usado pra testes
 * end-to-end (criar invoice → simular paid → receber webhook).
 *
 * NÃO funciona em prod (api.cora.com.br) — só em api.stage.cora.com.br.
 */
export async function payInvoiceInStage(invoiceId: string): Promise<unknown> {
  return coraRequest("/v2/invoices/pay", {
    method: "POST",
    body: { id: invoiceId },
    idempotencyKey: randomUUID(),
  });
}

/**
 * Retrieve invoice (consulta status). Usa quando webhook não chegou.
 */
export async function getInvoice(invoiceId: string): Promise<CoraInvoiceResponse> {
  return coraRequest<CoraInvoiceResponse>(`/v2/invoices/${invoiceId}`);
}
