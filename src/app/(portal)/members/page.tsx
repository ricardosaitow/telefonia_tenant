import { Plus, ShieldOff, Undo2, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/composed/empty-state";
import { PageHeader } from "@/components/composed/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMembers } from "@/features/members/queries";
import { ROLE_LABEL, STATUS_LABEL } from "@/features/members/schemas";
import { toggleMemberStatusAction } from "@/features/members/toggle-status-action";
import { updateMemberRoleAction } from "@/features/members/update-role-action";
import { assertSessionAndMembership } from "@/lib/rbac";
import { can } from "@/lib/rbac/permissions";

import { AddMemberForm } from "./add-form";

export default async function MembersPage() {
  const ctx = await assertSessionAndMembership();
  if (!can(ctx.membership.globalRole, "tenant:manage_members")) {
    redirect("/dashboard");
  }

  const members = await listMembers(ctx.activeTenantId);
  const isOwner = ctx.membership.globalRole === "tenant_owner";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Membros"
        description="Quem tem acesso a este tenant. Convite por email integrado chega quando Resend for ativado; por agora a pessoa precisa fazer signup primeiro."
      />

      <Card variant="solid" padding="lg" className="gap-3">
        <div className="flex items-center gap-2">
          <Plus className="text-muted-foreground size-4" />
          <h3 className="text-foreground text-sm font-medium">Adicionar membro existente</h3>
        </div>
        <AddMemberForm canCreateOwner={isOwner} />
      </Card>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nenhum membro ainda"
          description="Adicione o primeiro membro acima."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const isSelf = m.id === ctx.membership.id;
            const targetIsOwner = m.globalRole === "tenant_owner";
            const canMutate = !isSelf && (isOwner || !targetIsOwner);
            const isDisabled = m.status === "disabled";

            return (
              <li key={m.id}>
                <Card variant="solid" padding="default" className="flex-row items-center gap-4">
                  <div className="bg-glass-bg text-accent-light flex size-10 items-center justify-center rounded-md font-mono text-sm font-semibold">
                    {(m.account.nome ?? m.account.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground truncate text-sm font-medium">
                        {m.account.nome}
                      </p>
                      {isSelf ? (
                        <span className="text-accent-light bg-glass-bg rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          você
                        </span>
                      ) : null}
                      <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{m.account.email}</p>
                  </div>

                  {canMutate ? (
                    <form action={updateMemberRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="membershipId" value={m.id} />
                      <Select name="role" defaultValue={m.globalRole}>
                        <SelectTrigger className="min-w-36" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[])
                            .filter((r) => isOwner || r !== "tenant_owner")
                            .map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button type="submit" variant="outline" size="sm">
                        Salvar
                      </Button>
                    </form>
                  ) : (
                    <span className="bg-glass-bg text-muted-foreground rounded-sm px-2 py-1 text-xs font-medium">
                      {ROLE_LABEL[m.globalRole as keyof typeof ROLE_LABEL] ?? m.globalRole}
                    </span>
                  )}

                  {canMutate ? (
                    <form action={toggleMemberStatusAction}>
                      <input type="hidden" name="membershipId" value={m.id} />
                      <input
                        type="hidden"
                        name="intent"
                        value={isDisabled ? "enable" : "disable"}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        aria-label={isDisabled ? "Reativar" : "Desativar"}
                      >
                        {isDisabled ? <Undo2 /> : <ShieldOff />}
                      </Button>
                    </form>
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
