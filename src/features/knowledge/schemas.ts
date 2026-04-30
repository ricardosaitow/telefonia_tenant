import { z } from "zod";

export const knowledgeScopeSchema = z.enum(["tenant", "department", "agent"]);

export const knowledgeSourceTypeSchema = z.enum([
  "upload_pdf",
  "upload_docx",
  "upload_xlsx",
  "upload_txt",
  "url_crawl",
  "gdrive_folder",
  "notion",
  "manual_text",
]);

/**
 * V1 sem upload real: só metadados (storage_ref vem em fatia futura quando
 * houver volume/S3 conectado). status default = "ready" pra V1 (data plane
 * vai mover pra "indexing" → "ready" quando indexar embeddings).
 *
 * scopeRefId: null pra scope=tenant; UUID do dept/agent pra scope=department/
 * agent. Validação cruzada via superRefine — UI manda string vazia quando
 * scope=tenant, normalizamos pra undefined.
 *
 * Existência do dept/agent referenciado é validada na action (precisa de
 * acesso ao DB / RLS).
 */
// Object base — sem o refine cruzado scope×scopeRefId. Reutilizado pelas
// versões create/update (zod 4: `extend` não funciona em ZodEffects, então
// extendemos o object cru e re-aplicamos o refine).
const knowledgeSourceFieldsObject = z.object({
  nome: z.string().min(2).max(120).trim(),
  descricao: z
    .string()
    .max(500)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  scope: knowledgeScopeSchema.default("tenant"),
  scopeRefId: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tipo: knowledgeSourceTypeSchema,
  language: z
    .string()
    .max(10)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refineScopeRefId(val: { scope: string; scopeRefId?: string }, ctx: z.RefinementCtx) {
  if (val.scope === "tenant") {
    // tenant não admite scopeRefId; se UI mandar, apagamos via mutação.
    if (val.scopeRefId !== undefined) val.scopeRefId = undefined;
    return;
  }
  if (!val.scopeRefId) {
    ctx.addIssue({
      code: "custom",
      path: ["scopeRefId"],
      message:
        val.scope === "department"
          ? "Selecione o departamento dono desta fonte."
          : "Selecione o agente dono desta fonte.",
    });
    return;
  }
  if (!UUID_RE.test(val.scopeRefId)) {
    ctx.addIssue({
      code: "custom",
      path: ["scopeRefId"],
      message: "ID inválido.",
    });
  }
}

/**
 * V1 sem upload real: só metadados (storage_ref vem em fatia futura quando
 * houver volume/S3 conectado). status default = "ready" pra V1 (data plane
 * vai mover pra "indexing" → "ready" quando indexar embeddings).
 *
 * scopeRefId: null pra scope=tenant; UUID do dept/agent pra scope=department/
 * agent. Existência do dept/agent referenciado é validada na action (precisa
 * de acesso ao DB / RLS pra confirmar que pertence ao tenant ativo).
 */
export const knowledgeSourceInputSchema = knowledgeSourceFieldsObject.superRefine(refineScopeRefId);

export const updateKnowledgeSourceInputSchema = knowledgeSourceFieldsObject
  .extend({ id: z.string().uuid() })
  .superRefine(refineScopeRefId);

export type KnowledgeSourceInput = z.infer<typeof knowledgeSourceInputSchema>;
export type UpdateKnowledgeSourceInput = z.infer<typeof updateKnowledgeSourceInputSchema>;

export const KNOWLEDGE_TYPE_LABEL: Record<z.infer<typeof knowledgeSourceTypeSchema>, string> = {
  upload_pdf: "PDF",
  upload_docx: "DOCX",
  upload_xlsx: "Planilha",
  upload_txt: "Texto",
  url_crawl: "URL crawl",
  gdrive_folder: "Google Drive",
  notion: "Notion",
  manual_text: "Texto manual",
};

export const KNOWLEDGE_SCOPE_LABEL: Record<z.infer<typeof knowledgeScopeSchema>, string> = {
  tenant: "Tenant",
  department: "Departamento",
  agent: "Agente",
};

export const KNOWLEDGE_STATUS_LABEL: Record<string, string> = {
  uploading: "Carregando",
  indexing: "Indexando",
  ready: "Pronto",
  error: "Erro",
};
