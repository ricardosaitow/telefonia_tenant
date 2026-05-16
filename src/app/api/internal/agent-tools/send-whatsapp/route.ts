import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ChannelStatus, ChannelType } from "@/generated/prisma/client";
import { prismaAdmin } from "@/lib/db/admin-client";
import { isInternalRequestAuthorized } from "@/lib/internal-api/auth";

/**
 * Send-whatsapp "on behalf of" um tenant. Resolve canal whatsapp ativo do
 * tenant + chama o wa-bridge container desse canal (1 container per WA).
 *
 * Auth: env INTERNAL_API_KEY no header X-Internal-Auth.
 */
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  tenantSlug: z.string().min(1),
  to: z.string().min(8), // WhatsApp ID (com DDI ex: 5511999999999) ou Jabber ID
  text: z.string().min(1).max(4096),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isInternalRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", detail: String(err) },
      { status: 400 },
    );
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { slug: parsed.tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const channel = await prismaAdmin.channel.findFirst({
    where: { tenantId: tenant.id, tipo: ChannelType.whatsapp, status: ChannelStatus.active },
    select: { waBridgeUrl: true, waWid: true },
  });
  if (!channel?.waBridgeUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "whatsapp_channel_not_configured",
        detail: "Tenant não tem canal WhatsApp ativo com bridge provisionado",
      },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${channel.waBridgeUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: parsed.to, text: parsed.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const body = await resp.text();
      return NextResponse.json(
        {
          ok: false,
          error: "wa_bridge_send_failed",
          status: resp.status,
          detail: body.slice(0, 500),
        },
        { status: 502 },
      );
    }
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json({ ok: true, fromWid: channel.waWid, ...data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "wa_bridge_unreachable", detail: String(err) },
      { status: 502 },
    );
  }
}
