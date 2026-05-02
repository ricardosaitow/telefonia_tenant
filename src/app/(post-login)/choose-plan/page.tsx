import { redirect } from "next/navigation";

import { listAccountMemberships } from "@/lib/auth/active-tenant";
import { assertSession } from "@/lib/rbac";

import { ChoosePlanForm } from "./choose-plan-form";

export default async function ChoosePlanPage() {
  const ctx = await assertSession();
  const memberships = await listAccountMemberships(ctx.account.id);

  if (memberships.length > 0) {
    redirect("/tenants");
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 md:py-20">
      <div className="flex w-full max-w-5xl flex-col gap-12">
        {/* Hero */}
        <div className="flex flex-col gap-4 text-center">
          <h1 className="font-display text-foreground text-3xl leading-[1.1] font-bold tracking-tight md:text-4xl lg:text-5xl">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground mx-auto max-w-lg text-base leading-relaxed md:text-lg">
            Cada plano entrega o que você precisa pra rodar. Comece pelo Demo e escale quando fizer
            sentido.
          </p>
        </div>

        <ChoosePlanForm accountName={ctx.account.name} />
      </div>
    </div>
  );
}
