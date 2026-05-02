import { NextResponse } from "next/server";

import { pollAllEmailChannels } from "@/features/conversations/poll-email";

/**
 * POST /api/cron/email-poll
 *
 * Called by external cron (1-5 min interval). Polls all active email
 * channels for new inbound messages via IMAP/POP3.
 *
 * Auth: Bearer token matching CRON_BEARER_TOKEN env var.
 */
export async function POST(request: Request) {
  const token = process.env.CRON_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "CRON_BEARER_TOKEN not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pollAllEmailChannels();
  return NextResponse.json(result);
}
