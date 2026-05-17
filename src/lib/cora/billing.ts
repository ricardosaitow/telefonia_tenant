/**
 * High-level Cora billing — encapsula createPixInvoice + persistência em
 * cora_invoices + cálculo de período + atualização de Tenant.
 */
import { addDays, addMonths } from "date-fns";

import { prismaAdmin } from "@/lib/db/admin-client";

import { type CoraInvoiceResponse, createPixInvoice } from "./invoices";

export interface CreateCoraInvoiceArgs {
  tenantId: string;
  amountCents: number;
  customer: {
    name: string;
    email?: string;
    document: { identity: string; type: "CPF" | "CNPJ" };
  };
  /** Dias até vencimento (default 7 — janela pro user pagar). */
  dueInDays?: number;
  /** Service description visível na cobrança. */
  serviceName?: string;
  serviceDescription?: string;
}

export interface CoraInvoiceCreated {
  /** ID interno do nosso DB (UUID v7). */
  invoiceId: string;
  /** ID Cora (inv_XXX). */
  coraInvoiceId: string;
  /** Pix BR code copia-e-cola. NULL em stage (CIP não roda). */
  pixEmv: string | null;
  status: string;
  dueDate: Date;
  amountCents: number;
}

/**
 * Cria invoice Cora + persiste cora_invoices. Não atualiza status do Tenant
 * (isso só acontece via webhook quando paga).
 */
export async function createCoraPixInvoiceForTenant(
  args: CreateCoraInvoiceArgs,
): Promise<CoraInvoiceCreated> {
  const dueInDays = args.dueInDays ?? 7;
  const dueDate = addDays(new Date(), dueInDays);
  const dueDateIso = dueDate.toISOString().slice(0, 10); // YYYY-MM-DD

  const coraResponse = await createPixInvoice({
    customer: args.customer,
    services: [
      {
        name: args.serviceName ?? "Assinatura",
        description: args.serviceDescription,
        amount: args.amountCents,
      },
    ],
    dueDate: dueDateIso,
    paymentForms: ["PIX"],
    tenantId: args.tenantId,
  });

  const periodStart = new Date();
  const periodEnd = addMonths(periodStart, 1);

  const row = await prismaAdmin.coraInvoice.create({
    data: {
      tenantId: args.tenantId,
      coraInvoiceId: coraResponse.id,
      status: coraResponse.status,
      amountCents: args.amountCents,
      pixEmv: coraResponse.pix?.emv ?? null,
      dueDate,
      periodStart,
      periodEnd,
      rawPayload: JSON.parse(JSON.stringify(coraResponse)),
    },
  });

  return {
    invoiceId: row.id,
    coraInvoiceId: coraResponse.id,
    pixEmv: coraResponse.pix?.emv ?? null,
    status: coraResponse.status,
    dueDate,
    amountCents: args.amountCents,
  };
}

/**
 * Atualiza row local com dados frescos de uma response Cora. Idempotente.
 * Chamado de:
 *  - webhook handler quando recebe invoice.paid
 *  - polling /api/cora/invoice/:id/refresh quando UI puxa status
 */
export async function applyCoraInvoiceToLocal(resp: CoraInvoiceResponse): Promise<void> {
  const existing = await prismaAdmin.coraInvoice.findUnique({
    where: { coraInvoiceId: resp.id },
    select: { id: true, tenantId: true, periodStart: true, periodEnd: true },
  });
  if (!existing) {
    console.warn(
      "[cora-billing] applyCoraInvoiceToLocal: invoice",
      resp.id,
      "não encontrada local",
    );
    return;
  }

  const isPaid = resp.status === "PAID" || resp.total_paid >= resp.total_amount;
  const paidPayment = resp.payments?.find((p) => p.status === "FINALIZED");
  const paidAt = paidPayment?.finalized_at
    ? new Date(paidPayment.finalized_at)
    : isPaid
      ? new Date()
      : null;

  await prismaAdmin.coraInvoice.update({
    where: { coraInvoiceId: resp.id },
    data: {
      status: resp.status,
      pixEmv: resp.pix?.emv ?? null,
      paidAmountCents: resp.total_paid,
      paidAt,
      rawPayload: JSON.parse(JSON.stringify(resp)),
    },
  });

  // Se paid, atualiza tenant.subscriptionStatus + currentPeriodEnd
  if (isPaid && existing.tenantId) {
    await prismaAdmin.tenant.update({
      where: { id: existing.tenantId },
      data: {
        subscriptionStatus: "active",
        status: "active",
        currentPeriodEnd: existing.periodEnd,
      },
    });
  }
}
