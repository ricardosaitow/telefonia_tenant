import { type NextRequest, NextResponse } from "next/server";

import { handleStripeEvent, verifyStripeSignature } from "@/lib/stripe/webhook";

// Body deve chegar como raw bytes (HMAC). Next 16 + App Router: `req.text()`
// dá string raw. Não usar `req.json()` que faria parse e quebraria assinatura.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let event;
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");
    event = verifyStripeSignature(rawBody, sig);
  } catch (err) {
    console.error("[stripe-webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] erro processando evento", event.type, ":", err);
    // 500 faz Stripe retry. Eventos não-críticos a gente ignora (return 200).
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
