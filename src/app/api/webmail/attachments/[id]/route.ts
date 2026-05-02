import { readFile, stat } from "node:fs/promises";

import { NextResponse } from "next/server";

import { withTenantContext } from "@/lib/db/tenant-context";
import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertSessionAndMembership();
  assertCan(ctx.membership.globalRole, "email:view");

  const { id } = await params;

  const attachment = await withTenantContext(ctx.activeTenantId, (tx) =>
    tx.emailAttachment.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        storagePath: true,
      },
    }),
  );

  if (!attachment || !attachment.storagePath) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Verify file exists on disk
  try {
    await stat(attachment.storagePath);
  } catch {
    return NextResponse.json({ error: "file not found on disk" }, { status: 404 });
  }

  const fileBuffer = await readFile(attachment.storagePath);
  const contentType = attachment.mimeType ?? "application/octet-stream";
  const safeFilename = attachment.filename.replace(/[^\w.\-()[\] ]/g, "_");

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
