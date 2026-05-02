import Link from "next/link";

import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSignatureHtml } from "@/features/email-signature/queries";
import { getEmailChannels } from "@/features/webmail/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

import { WebmailPage } from "./webmail-page";

export default async function EmailPage() {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const channels = await getEmailChannels(ctx.activeTenantId);
  const sig = await getSignatureHtml(ctx.activeTenantId, ctx.membership.id);

  if (channels.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <PageHeader title="Email" description="Gerencie a caixa de email do seu atendimento" />
        <Card variant="solid" padding="lg">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhum canal de email configurado. Crie um canal de email para começar a usar o
              webmail.
            </p>
            <Button asChild>
              <Link href="/channels/new">Criar canal de email</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <WebmailPage
      channels={channels}
      defaultChannelId={channels[0]!.id}
      activeTenantId={ctx.activeTenantId}
      canSend={true}
      signatureHtml={sig.html}
    />
  );
}
