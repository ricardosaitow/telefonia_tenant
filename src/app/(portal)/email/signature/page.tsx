import { PageHeader } from "@/components/composed/page-header";
import { getSignatureByMembership } from "@/features/email-signature/queries";
import { assertSessionAndMembership } from "@/lib/rbac";

import { SignatureEditor } from "./signature-editor";

export default async function SignaturePage() {
  const ctx = await assertSessionAndMembership();

  const signature = await getSignatureByMembership(ctx.activeTenantId, ctx.membership.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Assinatura de email"
        description="Configure sua assinatura que será incluída automaticamente nos emails enviados"
      />
      <SignatureEditor initialConfig={signature.config} memberName={ctx.account.name} />
    </div>
  );
}
