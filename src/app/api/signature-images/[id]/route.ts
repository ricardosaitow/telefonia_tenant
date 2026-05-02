import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

const IMAGES_DIR = join(process.cwd(), "data", "signature-images");

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

// No auth — email recipients need to access these images.
// Cache immutable since filenames are UUIDs (content-addressed).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Sanitize: only allow uuid-like filenames with image extensions
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp)$/i.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

  const filePath = join(IMAGES_DIR, id);

  try {
    await stat(filePath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = `.${id.split(".").pop()?.toLowerCase()}`;
  const contentType = MIME_MAP[ext] ?? "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
