/**
 * POST /api/chat/upload
 *
 * Upload a file for chat messages (images, documents, audio, video).
 * Files are stored locally in `uploads/chat/` for V1; S3 in V2.
 *
 * Returns: { url, filename, mimeType, size }
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { assertSessionAndMembership } from "@/lib/rbac";
import { assertCan } from "@/lib/rbac/permissions";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "chat");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await assertSessionAndMembership();
    assertCan(ctx.membership.globalRole, "chat:send");
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "invalid_mime_type" }, { status: 400 });
  }

  // Generate unique filename
  const ext = path.extname(file.name) || mimeToExt(file.type);
  const uniqueName = `${crypto.randomUUID()}${ext}`;

  // Ensure upload directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(UPLOAD_DIR, uniqueName);
  await fs.writeFile(filePath, buffer);

  return NextResponse.json({
    url: `/api/chat/media/${uniqueName}`,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".weba",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };
  return map[mime] ?? "";
}
