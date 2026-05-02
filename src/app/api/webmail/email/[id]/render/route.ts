import { getEmailById } from "@/features/webmail/queries";
import { decryptCredential } from "@/lib/crypto/channel-credentials";
import { withTenantContext } from "@/lib/db/tenant-context";
import { fetchImapBody } from "@/lib/email/channel/imap-client";
import type { InboundConfig } from "@/lib/email/channel/types";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

/**
 * Serves the email body as a full HTML document for rendering inside an iframe.
 * Uses a permissive CSP that allows external images (email newsletters, etc).
 * The parent page embeds this via <iframe src="/api/webmail/email/:id/render">.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const { id } = await params;
  const email = await getEmailById(ctx.activeTenantId, id);

  if (!email) {
    return new Response("Not found", { status: 404 });
  }

  let html = email.bodyHtml;
  let text = email.bodyText;

  // Lazy-load body from IMAP if not cached
  if (!html && !text && email.uid) {
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

    if (channel?.inboundHost && channel.inboundUser && channel.inboundPassEnc) {
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
        html = body.html;
        text = body.text;

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
      } catch {
        // Fall through to empty body
      }
    }
  }

  const bodyContent = html
    ? html
    : text
      ? `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(text)}</pre>`
      : `<p style="color:#888">Corpo do email não disponível.</p>`;

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      word-wrap: break-word;
      overflow-wrap: break-word;
      background: white;
    }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; text-decoration: underline; }
    a:hover { color: #1d4ed8; }
    table { border-collapse: collapse; }
    p { margin: 0.5rem 0; }
    pre, code { white-space: pre-wrap; }
    * { max-width: 100%; }
  </style>
</head>
<body>${bodyContent}</body>
</html>`;

  return new Response(fullHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // CSP permissiva: permite imagens de qualquer origem (newsletters, tracking pixels, etc)
      "Content-Security-Policy":
        "default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline'; font-src data:",
      "X-Content-Type-Options": "nosniff",
      // Permite ser embedado pelo portal
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
