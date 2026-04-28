"use client";

import { getFormProps, getInputProps, getTextareaProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createKnowledgeSourceAction } from "@/features/knowledge/create-action";
import {
  KNOWLEDGE_SCOPE_LABEL,
  KNOWLEDGE_TYPE_LABEL,
  knowledgeSourceInputSchema,
  updateKnowledgeSourceInputSchema,
} from "@/features/knowledge/schemas";
import { updateKnowledgeSourceAction } from "@/features/knowledge/update-action";

type KnowledgeFormProps = {
  mode: "create" | "edit";
  defaultValues?: {
    id: string;
    nome: string;
    descricao: string | null;
    scope: keyof typeof KNOWLEDGE_SCOPE_LABEL;
    tipo: keyof typeof KNOWLEDGE_TYPE_LABEL;
    language: string | null;
  };
};

export function KnowledgeForm({ mode, defaultValues }: KnowledgeFormProps) {
  const action = mode === "create" ? createKnowledgeSourceAction : updateKnowledgeSourceAction;
  const schema = mode === "create" ? knowledgeSourceInputSchema : updateKnowledgeSourceInputSchema;

  const [lastResult, formAction, pending] = useActionState(action, undefined);

  const [form, fields] = useForm({
    lastResult,
    defaultValue: defaultValues
      ? {
          nome: defaultValues.nome,
          descricao: defaultValues.descricao ?? "",
          scope: defaultValues.scope,
          tipo: defaultValues.tipo,
          language: defaultValues.language ?? "",
        }
      : { scope: "tenant", tipo: "manual_text" },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-5">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      {mode === "edit" && defaultValues ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.nome.id}>Nome</Label>
        <Input
          {...getInputProps(fields.nome, { type: "text" })}
          key={fields.nome.key}
          autoComplete="off"
          required
          autoFocus
        />
        {fields.nome.errors?.length ? (
          <p className="text-destructive text-sm">{fields.nome.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.tipo.id}>Tipo</Label>
          <Select name={fields.tipo.name} defaultValue={defaultValues?.tipo ?? "manual_text"}>
            <SelectTrigger id={fields.tipo.id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KNOWLEDGE_TYPE_LABEL) as (keyof typeof KNOWLEDGE_TYPE_LABEL)[]).map(
                (k) => (
                  <SelectItem key={k} value={k}>
                    {KNOWLEDGE_TYPE_LABEL[k]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.scope.id}>Escopo</Label>
          <Select name={fields.scope.name} defaultValue={defaultValues?.scope ?? "tenant"}>
            <SelectTrigger id={fields.scope.id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KNOWLEDGE_SCOPE_LABEL) as (keyof typeof KNOWLEDGE_SCOPE_LABEL)[]).map(
                (k) => (
                  <SelectItem key={k} value={k}>
                    {KNOWLEDGE_SCOPE_LABEL[k]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.language.id}>Idioma (opcional)</Label>
        <Input
          {...getInputProps(fields.language, { type: "text" })}
          key={fields.language.key}
          autoComplete="off"
          placeholder="pt-BR, en-US, es-ES…"
          maxLength={10}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.descricao.id}>Descrição (opcional)</Label>
        <Textarea
          {...getTextareaProps(fields.descricao)}
          key={fields.descricao.key}
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href="/knowledge">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
