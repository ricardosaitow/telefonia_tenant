import { Phone, Plus } from "lucide-react";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { listExtensions } from "@/features/extensions/queries";
import { prismaAdmin } from "@/lib/db/admin-client";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { CreateExtensionForm } from "./create-extension-form";
import { DeleteExtensionButton } from "./delete-extension-button";
import { RevealPasswordButton } from "./reveal-password-button";

export default async function ExtensionsPage() {
  const ctx = await assertSessionAndMembership();
  const [extensions, tenant] = await Promise.all([
    listExtensions(ctx.activeTenantId),
    prismaAdmin.tenant.findUnique({
      where: { id: ctx.activeTenantId },
      select: { slug: true, pbxDomainUuid: true },
    }),
  ]);
  const canManage = can(ctx.membership.globalRole, "extension:manage");
  const sipDomain = tenant ? `${tenant.slug}.local` : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Ramais"
        description={
          sipDomain
            ? `Ramais SIP internos do tenant. Domain SIP: ${sipDomain}.`
            : "Ramais SIP internos do tenant."
        }
      />

      {!tenant?.pbxDomainUuid ? (
        <EmptyState
          icon={<Phone className="size-6" />}
          title="Domain SIP não provisionado"
          description="Este tenant ainda não tem Domain no FusionPBX. Recriar o tenant ou contatar suporte."
        />
      ) : (
        <>
          {canManage ? (
            <Card variant="solid" padding="default" className="flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Plus className="size-4" />
                  Novo ramal
                </div>
                <p className="text-muted-foreground text-sm">
                  Cria ramal SIP no FusionPBX. A senha gerada aparece uma vez — copie pra configurar
                  no Linphone/PortSIP. Depois, use &ldquo;Revelar senha&rdquo; pra recuperar.
                </p>
              </div>
              <CreateExtensionForm />
            </Card>
          ) : null}

          {extensions.length === 0 ? (
            <EmptyState
              icon={<Phone className="size-6" />}
              title="Nenhum ramal cadastrado"
              description={
                canManage
                  ? "Cadastre o primeiro ramal usando o formulário acima."
                  : "Peça pra um admin cadastrar um ramal."
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {extensions.map((ext) => (
                <li key={ext.id}>
                  <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                    <div className="bg-glass-bg flex size-10 items-center justify-center rounded-md">
                      <Phone className="text-accent-light size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ext.extension}</span>
                        {ext.displayName ? (
                          <span className="text-muted-foreground text-sm">— {ext.displayName}</span>
                        ) : null}
                        {!ext.enabled ? (
                          <span className="text-destructive text-xs">desabilitado</span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        SIP: {ext.extension}@{sipDomain}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex items-center gap-2">
                        <RevealPasswordButton id={ext.id} extension={ext.extension} />
                        <DeleteExtensionButton id={ext.id} extension={ext.extension} />
                      </div>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
