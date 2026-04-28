import { Mail, MessageCircle, MonitorSmartphone, Phone, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listChannels } from "@/features/channels/queries";
import { CHANNEL_TYPE_LABEL } from "@/features/channels/schemas";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

const STATUS_LABEL: Record<string, string> = {
  provisioning: "Provisionando",
  active: "Ativo",
  error: "Erro",
  disabled: "Desabilitado",
};

const TYPE_ICON = {
  voice_did: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  webchat: MonitorSmartphone,
} as const;

export default async function ChannelsPage() {
  const ctx = await assertSessionAndMembership();
  const channels = await listChannels(ctx.activeTenantId);
  const canManage = can(ctx.membership.globalRole, "channel:manage");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Canais"
        description="Pontos de entrada de conversa: voz (DID), WhatsApp, email e webchat. Roteamento (qual agente atende) chega na próxima fatia."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/channels/new">
                <Plus />
                Novo canal
              </Link>
            </Button>
          ) : null
        }
      />

      {channels.length === 0 ? (
        <EmptyState
          icon={<Phone className="size-6" />}
          title="Nenhum canal ainda"
          description={
            canManage
              ? "Cadastre o primeiro canal pra começar a receber conversas."
              : "Peça pra um admin cadastrar um canal."
          }
          action={
            canManage ? (
              <Button asChild>
                <Link href="/channels/new">
                  <Plus />
                  Criar canal
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {channels.map((c) => {
            const Icon = TYPE_ICON[c.tipo];
            return (
              <li key={c.id}>
                <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                  <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                    <Icon className="text-accent-light size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-foreground truncate text-base font-semibold tracking-tight">
                        {c.nomeAmigavel}
                      </p>
                      <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {CHANNEL_TYPE_LABEL[c.tipo]} · <code>{c.identificador}</code>
                    </p>
                  </div>
                  {canManage ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/channels/${c.id}`}>Editar</Link>
                    </Button>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
