import { logtoClient } from "@/lib/logto-client";

export const dynamic = "force-dynamic";

// Após signin no Logto, manda pro /tenants (tela de seleção de tenant). O
// rbac/assertSession agora lê Logto direto, então /tenants funciona com a
// sessão emitida pelo callback.
export const GET = logtoClient.handleSignInCallback("/tenants");
