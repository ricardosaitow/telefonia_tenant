import { type NextRequest, NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";

/**
 * Return URL do Checkout. Stripe redireciona o usuário aqui depois do
 * pagamento (sucesso OU cancelamento — `?canceled=1` distingue).
 *
 * Webhook é a source-of-truth da subscription. Esta rota só:
 *   - Confirma que session existe + pertence ao Stripe (signature implícita
 *     via API token).
 *   - Redireciona pra refresh-claims se completed (cookie do Logto pode
 *     precisar de novo claim `organizations`), senão volta pra /choose-plan.
 *
 * IMPORTANTE: usar `PORTAL_BASE_URL` env pros redirects absolutos. `req.url`
 * tem `Host: 0.0.0.0:5000` (interno do container Docker) porque Next.js não
 * confia o header `X-Forwarded-Host` do nginx por default.
 */
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  return process.env.PORTAL_BASE_URL ?? new URL(req.url).origin;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const canceled = url.searchParams.get("canceled");
  const base = baseUrl(req);

  if (canceled === "1") {
    return NextResponse.redirect(`${base}/choose-plan`);
  }
  if (!sessionId) {
    return NextResponse.redirect(`${base}/choose-plan`);
  }

  let status: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    status = session.status ?? null;
  } catch (err) {
    console.error("[stripe/return] session retrieve falhou:", err);
    return NextResponse.redirect(`${base}/choose-plan`);
  }

  // status pode ser 'open' | 'complete' | 'expired'. Aceitamos só 'complete'.
  if (status !== "complete") {
    return NextResponse.redirect(`${base}/choose-plan`);
  }

  // Webhook já deve ter atualizado o Tenant. Forçar refresh do ID token
  // pra trazer claim `organizations` atualizada (Org Logto criada no choose-plan).
  return NextResponse.redirect(`${base}/api/logto/refresh-claims?redirectTo=/dashboard`);
}
