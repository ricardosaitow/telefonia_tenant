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
 *  - / é pública (landing): segue sempre; page.tsx redireciona logado pra /tenants
 *  - /login e /signup: públicas; com JWT redireciona pra /
 *  - resto (/tenants, /dashboard, etc) sem JWT → /login
 *
 * **Cookies** (seguranca.md §6.2): em produção (`NODE_ENV=production`)
 * usamos `__Host-` prefix — exige Secure + Path=/ + sem Domain. Em dev,
 * sem prefix porque http://localhost. SameSite=Lax + HttpOnly em ambos.
 */
const isProd = process.env.NODE_ENV === "production";
const sessionCookieName = isProd ? "__Host-authjs.session-token" : "authjs.session-token";
const csrfCookieName = isProd ? "__Host-authjs.csrf-token" : "authjs.csrf-token";
const callbackCookieName = isProd ? "__Host-authjs.callback-url" : "authjs.callback-url";

export const authConfigEdge: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    csrfToken: {
      name: csrfCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: callbackCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = Boolean(auth?.user);
      const path = nextUrl.pathname;

      const isAuthPage = path === "/login" || path === "/signup";
      const isPublicPage = path === "/" || isAuthPage;

      // Tudo que NÃO é página pública exige login (matcher do proxy já filtra
      // assets/api). Cobre /tenants, /dashboard, /departments, e qualquer
      // futura rota do portal sem precisar manter lista aqui.
      if (!isPublicPage && !isLoggedIn) {
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
