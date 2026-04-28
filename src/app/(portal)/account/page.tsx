import { Building2, KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composed/page-header";
import { Card } from "@/components/ui/card";
import { getAccountById } from "@/features/account/queries";
import { ROLE_LABEL } from "@/features/members/schemas";
import { assertSession } from "@/lib/rbac";

import { ProfileForm } from "./profile-form";

export default async function AccountPage() {
  const ctx = await assertSession();
  const account = await getAccountById(ctx.account.id);
  if (!account) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Minha conta"
        description="Dados pessoais, segurança e tenants em que você é membro."
      />

      <Card variant="solid" padding="lg" className="gap-5">
        <div className="flex items-center gap-2">
          <UserCog className="text-muted-foreground size-4" />
          <h3 className="text-foreground text-sm font-medium">Perfil</h3>
        </div>
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <span>
            Email: <span className="text-foreground font-mono text-xs">{account.email}</span>{" "}
            <span className="text-muted-foreground text-xs">(troca via suporte)</span>
          </span>
          <span>
            Conta criada em{" "}
            <span className="text-foreground">{account.createdAt.toLocaleDateString("pt-BR")}</span>
          </span>
        </div>
        <ProfileForm initial={{ nome: account.nome, locale: account.locale }} />
      </Card>

      <Card variant="solid" padding="lg" className="gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-muted-foreground size-4" />
          <h3 className="text-foreground text-sm font-medium">Segurança</h3>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Senha</span>
            <span className="text-foreground text-xs">argon2id</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">MFA (TOTP)</span>
            <span className="bg-glass-bg text-muted-foreground rounded-sm px-1.5 py-0.5 text-xs">
              {account.mfaEnabled ? "Ativo" : "Não habilitado"}
              <span className="ml-1 text-[10px]">
                {account.mfaEnabled ? "" : "(em breve — D008)"}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Último login</span>
            <span className="text-foreground text-xs">
              {account.lastLoginAt ? account.lastLoginAt.toLocaleString("pt-BR") : "Nunca"}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <KeyRound className="size-3" />
          Troca de senha e MFA chegam em V1.x — a estrutura (TrustedDevice, backup codes) já está
          reservada no schema.
        </p>
      </Card>

      <Card variant="solid" padding="lg" className="gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="text-muted-foreground size-4" />
          <h3 className="text-foreground text-sm font-medium">Tenants</h3>
        </div>
        {account.memberships.length === 0 ? (
          <p className="text-muted-foreground text-sm">Você não é membro de nenhum tenant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {account.memberships.map((m) => (
              <li
                key={m.id}
                className="border-border/50 flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {m.tenant.nomeFantasia}
                  </p>
                  <p className="text-muted-foreground font-mono text-xs">{m.tenant.slug}</p>
                </div>
                <span className="bg-glass-bg text-accent-light rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                  {ROLE_LABEL[m.globalRole]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
