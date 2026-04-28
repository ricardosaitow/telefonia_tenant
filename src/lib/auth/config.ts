import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfigEdge } from "./config.edge";
import { verifyCredentials } from "./credentials";
import { createSession, validateSession } from "./session";

/**
 * Full NextAuth config — Node runtime. Estende authConfigEdge com:
 *  - Provider Credentials (authorize toca DB via Prisma).
 *  - Callbacks jwt/session que tocam DB pra revogação imediata.
 *
 * Restrição da v5: Credentials puro força strategy=jwt (UnsupportedStrategy
 * se database). JWT carrega só `sessionToken` opaco; callback session faz
 * lookup contra `sessions` e retorna sessão "vazia" (sessionToken="") se
 * inválida — preserva D008/seguranca.md §6.2.
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  ...authConfigEdge,
  providers: [
    Credentials({
      name: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const result = await verifyCredentials(parsed.data.email, parsed.data.password);
        if (!result.ok) return null;

        return {
          id: result.account.id,
          email: result.account.email,
          name: result.account.nome,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfigEdge.callbacks,
    async jwt({ token, user, trigger }) {
      if (trigger === "signIn" && user?.id) {
        const created = await createSession({ accountId: user.id });
        token.sessionToken = created.sessionToken;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.sessionToken !== "string") {
        return { ...session, sessionToken: "", activeTenantId: null };
      }

      const validated = await validateSession(token.sessionToken);
      if (!validated) {
        return { ...session, sessionToken: "", activeTenantId: null };
      }

      return {
        ...session,
        sessionToken: token.sessionToken,
        activeTenantId: validated.session.activeTenantId,
        user: {
          id: validated.account.id,
          email: validated.account.email,
          name: validated.account.nome,
        },
      };
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
