import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logtoServer } from "@/lib/logto-client";

/**
 * Header da landing (Server Component) — checa sessão Logto direto.
 *
 * Fluxo:
 *   session ativa → botão "Abrir dashboard" pra /tenants
 *   sem session   → botões "Entrar" + "Registrar-se"
 *
 * Fase 3 do plano [[sso-pekiart-logto]]: antes lia /api/auth/session do
 * Auth.js v5 (rota deletada). Agora lê logtoServer.getLogtoContext() server-
 * side, sem fetch client.
 */
export async function LandingHeader() {
  const { isAuthenticated } = await logtoServer.getLogtoContext({
    fetchUserInfo: false,
  });

  return (
    <header className="bg-background border-border sticky top-0 z-50 border-b px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between">
        <Link href="/" aria-label="telefon.ia" className="flex items-center gap-2.5">
          <Image src="/brand/logo.webp" alt="" width={32} height={32} priority />
          <span className="font-display text-foreground text-lg leading-none font-semibold tracking-tight">
            telefon
            <span className="bg-gradient-to-r from-[var(--brand-gradient-from)] to-[var(--brand-gradient-to)] bg-clip-text text-transparent">
              .ia
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button asChild size="sm" className="px-3 md:px-4">
              <Link href="/tenants">
                <span className="hidden md:inline">Abrir dashboard</span>
                <span className="md:hidden">Dashboard</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="px-3 md:px-4">
                <Link href="/signup">
                  <span className="hidden md:inline">Registrar-se</span>
                  <span className="md:hidden">Registrar</span>
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
