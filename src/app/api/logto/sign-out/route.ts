import { logtoClient } from "@/lib/logto-client";

export const dynamic = "force-dynamic";

export const GET = logtoClient.handleSignOut(process.env.LOGTO_BASE_URL ?? "/");
