/**
 * /pix-checkout/[id] — exibe QR code da invoice Cora + poll de status.
 *
 * Server component lê invoice do DB. Quando paid já redireciona pra
 * dashboard. Senão renderiza componente client que faz polling
 * /api/cora/invoice/[id]/status a cada 5s e mostra QR code.
 */
import { redirect } from "next/navigation";

import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSession } from "@/lib/rbac";

import { PixCheckoutClient } from "./pix-checkout-client";

export default async function PixCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await assertSession();

  const inv = await prismaAdmin.coraInvoice.findUnique({
    where: { id },
    include: {
      tenant: {
        select: {
          id: true,
          nomeFantasia: true,
          memberships: {
            where: { accountId: ctx.account.id },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!inv) {
    redirect("/choose-plan");
  }
  if (inv.tenant.memberships.length === 0) {
    redirect("/tenants");
  }
  if (inv.status === "PAID") {
    redirect("/api/logto/refresh-claims?redirectTo=/dashboard");
  }

  return (
    <PixCheckoutClient
      invoiceId={inv.id}
      pixEmv={inv.pixEmv}
      amountCents={inv.amountCents}
      tenantName={inv.tenant.nomeFantasia}
      dueDateIso={inv.dueDate.toISOString()}
    />
  );
}
