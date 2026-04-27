import { z } from "zod";

/**
 * Política de senha (docs/seguranca.md §7, NIST 800-63B):
 * - Mínimo 12 caracteres.
 * - Sem regra de classes (NIST 800-63B explicitamente desencoraja).
 * - Sem rotação forçada.
 * - Bloqueio de senhas vazadas via HaveIBeenPwned: vem em camada superior
 *   (Server Action), não no schema — depende de I/O.
 */
export const signupSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(12).max(256),
  nome: z.string().min(1).max(120).trim(),
  locale: z.enum(["pt-BR", "en-US", "es-ES"]).default("pt-BR"),
});

export type SignupInput = z.infer<typeof signupSchema>;
