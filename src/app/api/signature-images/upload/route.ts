import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { assertSessionAndMembership } from "@/lib/rbac";

const IMAGES_DIR = join(process.cwd(), "data", "signature-images");
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  await assertSessionAndMembership();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Imagem deve ter no máximo 2 MB." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo não permitido. Use JPEG, PNG, GIF ou WebP." },
      { status: 400 },
    );
  }

  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : ".png";
  const id = randomUUID();
  const filename = `${id}${ext}`;

  await mkdir(IMAGES_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(IMAGES_DIR, filename), buffer);

  return NextResponse.json({ id: filename, url: `/api/signature-images/${filename}` });
}
