import {
  Bot,
  Building2,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  MoveRight,
  Phone,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CHANNEL_TYPE_LABEL } from "@/features/channels/schemas";
import { listAllRoutingRules } from "@/features/routing/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

const CHANNEL_TYPE_ICON = {
  voice_did: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  webchat: MonitorSmartphone,
} as const;

export default async function RoutingPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "routing:manage")) {
    redirect("/dashboard");
  }

  const channels = await listAllRoutingRules(ctx.activeTenantId);
  const totalRules = channels.reduce((acc, ch) => acc + ch.routingRules.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Roteamento"
        description="Visão consolidada das regras por canal. Edição acontece dentro de cada canal."
      />

      {channels.length === 0 ? (
        <EmptyState
          icon={<Workflow className="size-6" />}
          title="Nenhum canal cadastrado"
          description="Crie canais primeiro pra configurar roteamento."
          action={
            <Button asChild>
              <Link href="/channels">Ir pra Canais</Link>
            </Button>
          }
        />
      ) : totalRules === 0 ? (
        <EmptyState
          icon={<Workflow className="size-6" />}
          title="Nenhuma regra configurada"
          description="Abra um canal e adicione regras na seção Roteamento."
          action={
            <Button asChild>
              <Link href="/channels">Ir pra Canais</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {channels.map((ch) => {
            const ChannelIcon = CHANNEL_TYPE_ICON[ch.tipo];
            return (
              <li key={ch.id}>
                <Card variant="solid" padding="default" className="gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                      <ChannelIcon className="text-accent-light size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-foreground truncate text-base font-semibold tracking-tight">
                        {ch.nomeAmigavel}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {CHANNEL_TYPE_LABEL[ch.tipo]} · <code>{ch.identificador}</code>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/channels/${ch.id}`}>Configurar</Link>
                    </Button>
                  </div>

                  {ch.routingRules.length === 0 ? (
                    <p className="text-muted-foreground border-divider border-t pt-3 text-xs">
                      Nenhuma regra. Sem regra, o canal não roteia conversas.
                    </p>
                  ) : (
                    <ul className="border-divider flex flex-col gap-1.5 border-t pt-3">
                      {ch.routingRules.map((rule) => {
                        const isDefault = rule.id === ch.defaultRoutingRuleId;
                        const TargetIcon = rule.targetDepartmentId ? Building2 : Bot;
                        const targetName =
                          rule.targetDepartment?.nome ??
                          rule.targetAgent?.nome ??
                          "(target removido)";
                        const targetType = rule.targetDepartmentId ? "Departamento" : "Agente";
                        return (
                          <li
                            key={rule.id}
                            className="text-muted-foreground flex items-center gap-2 text-xs"
                          >
                            <MoveRight className="size-3.5" />
                            <TargetIcon className="text-accent-light size-3.5" />
                            <span className="text-foreground font-medium">{targetName}</span>
                            <span>· {targetType.toLowerCase()}</span>
                            {isDefault ? (
                              <span className="text-accent-light bg-glass-bg ml-auto rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                                padrão
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
