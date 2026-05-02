import { NextResponse } from "next/server";

import { getEmailFolders } from "@/features/webmail/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

export async function GET(request: Request) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const folders = await getEmailFolders(ctx.activeTenantId, channelId);
  return NextResponse.json(folders);
}
