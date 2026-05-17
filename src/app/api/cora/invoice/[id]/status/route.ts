/**
 * Polling endpoint pra UI saber se a invoice Cora foi paga. Lê do nosso
 * DB local (webhook atualiza). Se status ainda DRAFT/OPEN, refresh via
 * API Cora pra pegar pix.emv quando CIP registrar.
 *
 * Auth: precisa estar autenticado + ser owner do tenant da invoice.
 */
import { type NextRequest, NextResponse } from "next/server";

import { applyCoraInvoiceToLocal } from "@/lib/cora/billing";
import { getInvoice } from "@/lib/cora/invoices";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSession } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const ctx = await assertSession();

  const inv = await prismaAdmin.coraInvoice.findUnique({
    where: { id },
    include: {
      tenant: {
        select: {
          id: true,
          memberships: {
            where: { accountId: ctx.account.id },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (inv.tenant.memberships.length === 0) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Se ainda não PAID, refresh via API Cora pra pegar pix.emv atualizado
  // (em prod, fica disponível após CIP registrar — pode ser segundos depois)
  let pixEmv = inv.pixEmv;
  let status = inv.status;
  if (inv.status !== "PAID" && inv.status !== "CANCELED") {
    try {
      const fresh = await getInvoice(inv.coraInvoiceId);
      await applyCoraInvoiceToLocal(fresh);
      pixEmv = fresh.pix?.emv ?? pixEmv;
      status = fresh.status;
    } catch (err) {
      // Falha silencioso — retorna estado local
      console.warn("[cora-status] refresh falhou:", err);
    }
  }

  return NextResponse.json({
    id: inv.id,
    coraInvoiceId: inv.coraInvoiceId,
    status,
    pixEmv,
    amountCents: inv.amountCents,
    paidAt: inv.paidAt,
    dueDate: inv.dueDate,
    paid: status === "PAID",
  });
}
