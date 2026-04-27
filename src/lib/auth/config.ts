import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { verifyCredentials } from "./credentials";
import { createSession, validateSession } from "./session";

/**
 * NextAuth v5 + provider Credentials.
 *
 * Restrição da v5: se o único provider é Credentials, `session.strategy=database`
 * lança UnsupportedStrategy. Solução: strategy=jwt + Session DB-backed manual
 * (callbacks `jwt` e `session`). O JWT carrega só `sessionToken` opaco; a cada
 * request o callback `session` faz lookup contra `sessions` e retorna null se
 * revogada/expirada — preserva revogação imediata (D008/seguranca.md §6.2).
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
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
        return { ...session, sessionToken: "" };
      }

      const validated = await validateSession(token.sessionToken);
      if (!validated) {
        return { ...session, sessionToken: "" };
      }

      return {
        ...session,
        sessionToken: token.sessionToken,
        user: {
          id: validated.account.id,
          email: validated.account.email,
          name: validated.account.nome,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
