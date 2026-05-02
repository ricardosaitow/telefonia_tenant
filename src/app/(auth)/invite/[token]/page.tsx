import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL } from "@/features/members/schemas";
import { auth } from "@/lib/auth/config";
import { hashToken } from "@/lib/auth/tokens";
import { prismaAdmin } from "@/lib/db/admin-client";

import { AcceptInviteButton } from "./accept-invite-button";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const tokenHash = hashToken(token);

  const invite = await prismaAdmin.inviteToken.findFirst({
    where: { tokenHash },
    include: {
      tenant: { select: { nomeFantasia: true } },
      invitedBy: { select: { nome: true } },
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <Card variant="solid" padding="lg" className="w-full gap-6">
        <CardHeader>
          <CardTitle>Convite inválido</CardTitle>
        </CardHeader>
        <Alert variant="destructive">
          <AlertDescription>Este convite expirou ou já foi utilizado.</AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="text-accent-light hover:underline">
            Ir para login
          </Link>
        </p>
      </Card>
    );
  }

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const roleLabel = ROLE_LABEL[invite.role] ?? invite.role;

  return (
    <Card variant="solid" padding="lg" className="w-full gap-6">
      <CardHeader>
        <CardTitle>Convite para {invite.tenant.nomeFantasia}</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <p className="text-foreground text-sm">
          <strong>{invite.invitedBy.nome}</strong> convidou <strong>{invite.email}</strong> como{" "}
          <strong>{roleLabel}</strong>.
        </p>

        {isLoggedIn ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              Faça login ou crie uma conta para aceitar o convite.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="text-accent-light text-sm hover:underline"
              >
                Entrar
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="text-accent-light text-sm hover:underline"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
