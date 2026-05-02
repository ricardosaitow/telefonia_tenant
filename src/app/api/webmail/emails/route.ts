import { NextResponse } from "next/server";

import { getEmails } from "@/features/webmail/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

export async function GET(request: Request) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const folderId = searchParams.get("folderId");
  if (!channelId || !folderId) {
    return NextResponse.json({ error: "channelId and folderId required" }, { status: 400 });
  }

  const search = searchParams.get("search") ?? undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;

  const result = await getEmails(ctx.activeTenantId, channelId, folderId, { search, page });
  return NextResponse.json(result);
}
