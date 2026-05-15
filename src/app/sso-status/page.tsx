import Link from "next/link";

import { logtoServer } from "@/lib/logto-client";

/**
 * Página de validação do SSO Logto no portal — Sprint 2 do plano
 * [[sso-pekiart-logto]]. Lê o contexto Logto direto (não usa Auth.js).
 *
 * Quando Fase 3 migrar o `assertSession()` pra ler Logto, essa página
 * deixa de existir e o fluxo volta a ser /api/logto/sign-in-callback →
 * /tenants → app.
 */
export default async function SsoStatusPage() {
  const { isAuthenticated, claims } = await logtoServer.getLogtoContext({
    fetchUserInfo: false,
  });

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-3xl font-bold tracking-tight">SSO Logto · Portal</h1>
        <p className="text-muted-foreground mt-4">
          Você não está autenticado via Logto. Inicie o fluxo:
        </p>
        <Link
          href="/api/logto/sign-in"
          className="bg-primary text-primary-foreground mt-6 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold"
        >
          Entrar com Logto
        </Link>
      </main>
    );
  }

  const orgs = claims?.organizations ?? [];
  const roles = claims?.organization_roles ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">✅ Autenticado via Logto</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        Sprint 2 validada — portal lê a mesma sessão Logto que o meet.ia. SSO cross-app funcionando
        no nível do IdP. Fase 3 substitui o <code>assertSession()</code> do RBAC pra fluir essas
        claims no resto do app.
      </p>

      <section className="mt-10 space-y-6">
        <Block label="User identity (claims)">
          <Row label="sub" value={claims?.sub ?? "—"} mono />
          <Row label="name" value={claims?.name ?? "—"} />
          <Row label="username" value={claims?.username ?? "—"} />
          <Row label="email" value={claims?.email ?? "—"} />
          <Row label="email_verified" value={String(claims?.email_verified ?? "—")} />
        </Block>

        <Block label={`Organizations (${orgs.length})`}>
          {orgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Você não pertence a nenhuma org Logto ainda.
            </p>
          ) : (
            orgs.map((id) => {
              const r = roles.filter((rr) => rr.startsWith(`${id}:`)).map((rr) => rr.split(":")[1]);
              return (
                <Row key={id} label={id} value={r.length > 0 ? r.join(", ") : "(sem role)"} mono />
              );
            })
          )}
        </Block>
      </section>

      <div className="mt-12 flex gap-3">
        <Link
          href="/api/logto/sign-out"
          className="border-divider-strong hover:bg-muted inline-flex h-11 items-center rounded-md border px-5 text-sm font-medium"
        >
          Sair do Logto
        </Link>
        <Link
          href="http://localhost:56100/dashboard"
          className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold"
        >
          Ir pro meet.ia →
        </Link>
      </div>
    </main>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-divider-strong rounded-lg border p-5">
      <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
        {label}
      </h2>
      <dl className="divide-divider-strong divide-y">{children}</dl>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted-foreground w-40 shrink-0">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}
