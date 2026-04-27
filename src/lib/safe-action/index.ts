import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";

/**
 * Cliente base — sem auth context ainda. O `authActionClient` (com session +
 * tenant) chega no passo 8c, junto com a tela de seleção de tenant.
 *
 * Erros não esperados são logados e devolvidos como mensagem genérica pra
 * não vazar stack ao cliente (regra de seguranca.md §5.5).
 */
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error("[safe-action] server error:", error);
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
});
