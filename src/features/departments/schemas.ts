import { z } from "zod";

/**
 * Department: nome (visível) + descricao opcional. Slug é auto-gerado a
 * partir do nome no create — não pedimos do user na V1 pra simplificar.
 */
export const departmentInputSchema = z.object({
  nome: z.string().min(2).max(120).trim(),
  descricao: z
    .string()
    .max(500)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const updateDepartmentInputSchema = departmentInputSchema.extend({
  id: z.string().uuid(),
});

export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentInputSchema>;

/**
 * Slugify simples — sem sufixo random (constraint @@unique([tenantId, slug])
 * pega colisão e a action devolve erro pro usuário).
 */
export function slugifyDepartmentName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "departamento";
}
