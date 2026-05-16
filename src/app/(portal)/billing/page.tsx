import Link from "next/link";

import { PageHeader } from "@/components/composed/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLANS } from "@/features/plans/constants";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSessionAndMembership } from "@/lib/rbac";

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial ativo",
  active: "Ativa",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

type PageProps = {
  searchParams?: Promise<{ status?: string; expired?: string; error?: string }>;
};

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function BillingPage({ searchParams }: PageProps) {
  const ctx = await assertSessionAndMembership();
  const sp = (await searchParams) ?? {};

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: ctx.activeTenantId },
    select: {
      nomeFantasia: true,
      planSlug: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
      subscriptionStatus: true,
    },
  });
  if (!tenant) return null;

  const plan = PLANS[tenant.planSlug as keyof typeof PLANS];
  const hasStripe = !!tenant.stripeCustomerId;
  const isActive = tenant.status === "active" || tenant.status === "trial";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader title="Plano e cobrança" description="Gerencie sua assinatura." />

      {sp.expired === "trial" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Seu trial expirou. Assine um plano pra continuar usando os recursos.
          </AlertDescription>
        </Alert>
      ) : null}
      {sp.status === "suspended" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Sua assinatura está suspensa (pagamento não confirmado). Atualize o cartão.
          </AlertDescription>
        </Alert>
      ) : null}
      {sp.status === "canceled" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Sua assinatura foi cancelada. Você pode reativar abaixo.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card variant="solid" padding="lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Plano atual</p>
              <h2 className="text-foreground font-display text-2xl font-bold">
                {plan?.name ?? tenant.planSlug}
              </h2>
              <p className="text-muted-foreground text-sm">
                Status:{" "}
                <span className="text-foreground">
                  {STATUS_LABEL[tenant.status] ?? tenant.status}
                </span>
              </p>
              {tenant.trialEndsAt && tenant.status === "trial" ? (
                <p className="text-muted-foreground text-sm">
                  Trial termina em {tenant.trialEndsAt.toLocaleDateString("pt-BR")}
                </p>
              ) : null}
              {tenant.currentPeriodEnd && tenant.status === "active" ? (
                <p className="text-muted-foreground text-sm">
                  Próxima cobrança em {tenant.currentPeriodEnd.toLocaleDateString("pt-BR")}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              {plan?.price !== null && plan?.price !== undefined ? (
                <p className="font-display text-foreground text-2xl font-bold">
                  {plan.price === 0 ? "Grátis" : `${formatBRL(plan.price)}/mês`}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {hasStripe ? (
              <Button asChild>
                <a href="/api/stripe/billing-portal">Gerenciar pagamento</a>
              </Button>
            ) : null}
            {!isActive || tenant.planSlug === "demo" ? (
              <Button variant="outline" asChild>
                <Link href="/choose-plan">
                  {tenant.planSlug === "demo" ? "Fazer upgrade" : "Escolher plano"}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
