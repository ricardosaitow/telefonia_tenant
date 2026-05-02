import { NextResponse } from "next/server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { getWaBridgeCombined } from "@/lib/whatsapp/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/channels/[id]/wa
 *
 * Returns combined wa-bridge status + QR for client polling.
 * Auth check + RLS-scoped channel lookup.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;

  let authCtx;
  try {
    authCtx = await assertSessionAndMembership();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const channel = await withTenantContext(authCtx.activeTenantId, (tx) =>
    tx.channel.findUnique({
      where: { id },
      select: { tipo: true, waBridgeUrl: true, status: true },
    }),
  );

  if (!channel) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (channel.tipo !== "whatsapp") {
    return NextResponse.json({ error: "not_whatsapp" }, { status: 400 });
  }

  if (!channel.waBridgeUrl) {
    return NextResponse.json({ error: "no_bridge_url" }, { status: 400 });
  }

  try {
    const combined = await getWaBridgeCombined(channel.waBridgeUrl);
    return NextResponse.json(combined);
  } catch {
    return NextResponse.json(
      { state: "disconnected", wid: null, pushname: null, qr: null },
      { status: 200 },
    );
  }
}
