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
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const canceled = url.searchParams.get("canceled");

  if (canceled === "1") {
    return NextResponse.redirect(new URL("/choose-plan", req.url));
  }
  if (!sessionId) {
    return NextResponse.redirect(new URL("/choose-plan", req.url));
  }

  let status: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    status = session.status ?? null;
  } catch (err) {
    console.error("[stripe/return] session retrieve falhou:", err);
    return NextResponse.redirect(new URL("/choose-plan", req.url));
  }

  // status pode ser 'open' | 'complete' | 'expired'. Aceitamos só 'complete'.
  if (status !== "complete") {
    return NextResponse.redirect(new URL("/choose-plan", req.url));
  }

  // Webhook já deve ter atualizado o Tenant. Forçar refresh do ID token
  // pra trazer claim `organizations` atualizada (Org Logto criada no choose-plan).
  return NextResponse.redirect(new URL("/api/logto/refresh-claims?redirectTo=/dashboard", req.url));
}
