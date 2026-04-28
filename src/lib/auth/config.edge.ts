import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config — usado pelo middleware (Edge runtime, sem Prisma).
 *
 * Não inclui:
 *  - Providers que chamam Prisma (Credentials.authorize) → vivem em config.ts
 *  - Callbacks jwt/session que tocam DB → vivem em config.ts
 *
 * O middleware só precisa verificar JWT existente + decidir redirects baseados
 * em path. Não precisa instanciar provider, não precisa lookup DB.
 *
 * Os redirects abaixo são:
 *  - rota protegida (/tenants, /dashboard, etc) sem JWT → /login
 *  - /login ou /signup com JWT → / (que decide /tenants ou /dashboard)
 */
export const authConfigEdge: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = Boolean(auth?.user);
      const path = nextUrl.pathname;

      const isAuthPage = path === "/login" || path === "/signup";

      // Tudo que NÃO é auth page exige login (matcher do proxy já filtra
      // assets/api). Cobre /tenants, /dashboard, /departments, e qualquer
      // futura rota do portal sem precisar manter lista aqui.
      if (!isAuthPage && !isLoggedIn) {
        const url = nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        return Response.redirect(url);
      }

      if (isAuthPage && isLoggedIn) {
        const url = nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return Response.redirect(url);
      }

      return true;
    },
  },
};
