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
 * scopeRefId fica nullable; pra scope=tenant é null mesmo. Pra scope=
 * department/agent vai ser exigido em fatia futura (UI pra escolher).
 */
export const knowledgeSourceInputSchema = z.object({
  nome: z.string().min(2).max(120).trim(),
  descricao: z
    .string()
    .max(500)
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  scope: knowledgeScopeSchema.default("tenant"),
  tipo: knowledgeSourceTypeSchema,
  language: z
    .string()
    .max(10)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const updateKnowledgeSourceInputSchema = knowledgeSourceInputSchema.extend({
  id: z.string().uuid(),
});

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
