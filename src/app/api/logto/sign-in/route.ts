import { logtoClient } from "@/lib/logto-client";

export const dynamic = "force-dynamic";

export const GET = logtoClient.handleSignIn(
  `${process.env.LOGTO_BASE_URL}/api/logto/sign-in-callback`,
);
