import { redirect } from "next/navigation";

/**
 * /login agora é um server redirect pra `/api/logto/sign-in`. Fluxo de
 * autenticação inteiro vive no Logto desde a Fase 3 do plano
 * [[sso-pekiart-logto]]. UI de form Auth.js v5 foi removida.
 *
 * Mantemos a URL pública /login pra preservar links externos (botão "Entrar"
 * em emails, marketing, etc).
 */
export default function LoginPage() {
  redirect("/api/logto/sign-in");
}
