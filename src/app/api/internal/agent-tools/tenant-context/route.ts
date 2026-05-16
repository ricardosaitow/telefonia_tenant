import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ChannelStatus, ChannelType } from "@/generated/prisma/client";
import { prismaAdmin } from "@/lib/db/admin-client";
import { isInternalRequestAuthorized } from "@/lib/internal-api/auth";

/**
 * Retorna config operacional do tenant pro bridge-ia usar nas tools:
 *   - business hours (open/close hour, days)
 *   - timezone
 *   - branding (nome_fantasia)
 *   - flags de canais ativos (tem_whatsapp, tem_email)
 *
 * NÃO retorna credentials. Send é via /api/internal/agent-tools/send-{email,whatsapp}.
 */
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  tenantSlug: z.string().min(1),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isInternalRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse({ tenantSlug: url.searchParams.get("tenantSlug") });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", detail: String(err) },
      { status: 400 },
    );
  }

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { slug: parsed.tenantSlug },
    select: {
      id: true,
      slug: true,
      nomeFantasia: true,
      businessOpenHour: true,
      businessCloseHour: true,
      businessDays: true,
      timezone: true,
    },
  });
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  // Conta canais ativos por tipo (não retorna IDs/creds — só presença)
  const [waCount, emailCount] = await Promise.all([
    prismaAdmin.channel.count({
      where: { tenantId: tenant.id, tipo: ChannelType.whatsapp, status: ChannelStatus.active },
    }),
    prismaAdmin.channel.count({
      where: { tenantId: tenant.id, tipo: ChannelType.email, status: ChannelStatus.active },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      nomeFantasia: tenant.nomeFantasia,
      businessOpenHour: tenant.businessOpenHour,
      businessCloseHour: tenant.businessCloseHour,
      businessDays: tenant.businessDays,
      timezone: tenant.timezone,
    },
    channels: {
      hasWhatsapp: waCount > 0,
      hasEmail: emailCount > 0,
    },
  });
}
