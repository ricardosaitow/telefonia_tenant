import { NextResponse } from "next/server";

import { getEmailById } from "@/features/webmail/queries";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const { id } = await params;
  const email = await getEmailById(ctx.activeTenantId, id);

  if (!email) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(email);
}
