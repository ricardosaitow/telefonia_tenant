import { z } from "zod";

/**
 * Política de senha (docs/seguranca.md §7, NIST 800-63B):
 * - Mínimo 12 caracteres.
 * - Sem regra de classes (NIST 800-63B explicitamente desencoraja).
 * - Sem rotação forçada.
 * - Bloqueio de senhas vazadas via HaveIBeenPwned: vem em camada superior
 *   (Server Action), não no schema — depende de I/O.
 */
export const signupSchema = z
  .object({
    email: z.string().email().max(255).trim().toLowerCase(),
    password: z.string().min(12).max(256),
    confirmPassword: z.string().min(1).max(256),
    nome: z.string().min(1).max(120).trim(),
    locale: z.enum(["pt-BR", "en-US", "es-ES"]).default("pt-BR"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
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

/**
 * Forgot password — single email field. Anti-enumeração: action sempre
 * retorna sucesso independente de o email existir.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password — token (hidden) + nova senha + confirmação.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(12).max(256),
    confirmPassword: z.string().min(1).max(256),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
