import { NextResponse } from "next/server";

import { getEmailById } from "@/features/webmail/queries";
import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { withTenantContext } from "@/lib/db/tenant-context";
import { fetchImapBody } from "@/lib/email/channel/imap-client";
import type { InboundConfig } from "@/lib/email/channel/types";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

/**
 * Lazy-loads email body from IMAP and caches in DB.
 * Called by the client when bodyText and bodyHtml are both null.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const { id } = await params;
  const email = await getEmailById(ctx.activeTenantId, id);

  if (!email) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Already cached
  if (email.bodyText || email.bodyHtml) {
    return NextResponse.json({ text: email.bodyText, html: email.bodyHtml });
  }

  if (!email.uid) {
    return NextResponse.json({ text: null, html: null });
  }

  const channel = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.channel.findUnique({
      where: { id: email.channelId },
      select: {
        inboundProto: true,
        inboundHost: true,
        inboundPort: true,
        inboundUser: true,
        inboundPassEnc: true,
        inboundSecurity: true,
      },
    }),
  );

  if (!channel?.inboundHost || !channel.inboundUser || !channel.inboundPassEnc) {
    return NextResponse.json({ text: null, html: null });
  }

  const config: InboundConfig = {
    proto: (channel.inboundProto as "imap" | "pop3") ?? "imap",
    host: channel.inboundHost,
    port: channel.inboundPort ?? 993,
    user: channel.inboundUser,
    pass: decryptCredential(channel.inboundPassEnc),
    security: (channel.inboundSecurity as "tls" | "starttls" | "none") ?? "tls",
  };

  try {
    const body = await fetchImapBody(config, email.uid);

    // Cache in DB
    if (body.text || body.html) {
      await withTenantContext(ctx.activeTenantId, (tx) =>
        tx.emailMessage.update({
          where: { id: email.id },
          data: {
            bodyText: body.text,
            bodyHtml: body.html,
            preview: (body.text ?? "").substring(0, 200) || email.preview,
          },
        }),
      );
    }

    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ text: null, html: null });
  }
}
