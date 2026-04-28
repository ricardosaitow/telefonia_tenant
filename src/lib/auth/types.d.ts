import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    sessionToken: string;
    activeTenantId: string | null;
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      name: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionToken?: string;
  }
}
