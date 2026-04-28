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
  // Empresa de quem está cadastrando — vira Tenant + Membership owner
  // atomicamente no signup (D004). Em V1.x, convite pra tenant existente
  // virá em fluxo separado.
  nomeTenant: z.string().min(2).max(120).trim(),
  locale: z.enum(["pt-BR", "en-US", "es-ES"]).default("pt-BR"),
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Login schema — sem regra de comprimento mínimo de senha (a regra existe no
 * signup; quem já tem account pode ter senha curta legada). Só valida que os
 * dois campos estão presentes; o argon2.verify resolve o resto.
 */
export const signinSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(1).max(256),
});

export type SigninInput = z.infer<typeof signinSchema>;
