import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { ChannelForm } from "../channel-form";

export default async function NewChannelPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "channel:manage")) {
    redirect("/channels");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Novo canal"
        description="Conecte seus canais de Voz (SIP Trunk), WhatsApp Business, E-mail e seu Webchat."
      />
      <Card variant="solid" padding="lg">
        <ChannelForm mode="create" />
      </Card>
    </div>
  );
}
