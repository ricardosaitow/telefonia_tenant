/**
 * GET /api/chat/media/[filename]
 *
 * Serve uploaded chat media files.
 * Auth-gated to prevent unauthorized access.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { assertSessionAndMembership } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "chat");

type RouteContext = {
  params: Promise<{ filename: string }>;
};

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    await assertSessionAndMembership();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { filename } = await ctx.params;

  // Prevent path traversal
  const safeName = path.basename(filename);
  if (safeName !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "invalid_filename" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, safeName);

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
