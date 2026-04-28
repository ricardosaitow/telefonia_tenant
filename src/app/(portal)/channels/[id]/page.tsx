import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getChannelById } from "@/features/channels/queries";
import { CHANNEL_TYPE_LABEL } from "@/features/channels/schemas";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { ChannelForm } from "../channel-form";
import { DeleteChannelButton } from "./delete-button";

type EditChannelPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditChannelPage({ params }: EditChannelPageProps) {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "channel:manage")) {
    redirect("/channels");
  }

  const { id } = await params;
  const channel = await getChannelById(ctx.activeTenantId, id);
  if (!channel) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Editar canal"
        description={`${CHANNEL_TYPE_LABEL[channel.tipo]} · ${channel.identificador}`}
        actions={<DeleteChannelButton id={channel.id} nome={channel.nomeAmigavel} />}
      />
      <Card variant="solid" padding="lg">
        <ChannelForm
          mode="edit"
          defaultValues={{
            id: channel.id,
            tipo: channel.tipo,
            identificador: channel.identificador,
            nomeAmigavel: channel.nomeAmigavel,
          }}
        />
      </Card>
    </div>
  );
}
