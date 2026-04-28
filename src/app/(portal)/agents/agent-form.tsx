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
import { createAgentAction } from "@/features/agents/create-action";
import { agentInputSchema, updateAgentInputSchema } from "@/features/agents/schemas";
import { updateAgentAction } from "@/features/agents/update-action";

type DepartmentOption = { id: string; nome: string };

type AgentFormProps = {
  mode: "create" | "edit";
  departments: DepartmentOption[];
  defaultValues?: {
    id: string;
    nome: string;
    descricao: string | null;
    departmentId: string;
    systemPrompt: string;
  };
};

export function AgentForm({ mode, departments, defaultValues }: AgentFormProps) {
  const action = mode === "create" ? createAgentAction : updateAgentAction;
  const schema = mode === "create" ? agentInputSchema : updateAgentInputSchema;

  const [lastResult, formAction, pending] = useActionState(action, undefined);

  const [form, fields] = useForm({
    lastResult,
    defaultValue: defaultValues
      ? {
          nome: defaultValues.nome,
          descricao: defaultValues.descricao ?? "",
          departmentId: defaultValues.departmentId,
          systemPrompt: defaultValues.systemPrompt,
        }
      : undefined,
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
        <Label htmlFor={fields.nome.id}>Nome do agente</Label>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.departmentId.id}>Departamento</Label>
        {/* Radix Select não é <select> nativo — props manuais (name + defaultValue);
            getSelectProps do Conform é pra select HTML, não bate com este. */}
        <Select name={fields.departmentId.name} defaultValue={defaultValues?.departmentId}>
          <SelectTrigger
            id={fields.departmentId.id}
            aria-invalid={fields.departmentId.errors?.length ? true : undefined}
          >
            <SelectValue placeholder="Escolha um departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fields.departmentId.errors?.length ? (
          <p className="text-destructive text-sm">{fields.departmentId.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.descricao.id}>Descrição (opcional)</Label>
        <Textarea
          {...getTextareaProps(fields.descricao)}
          key={fields.descricao.key}
          rows={2}
          maxLength={500}
        />
        {fields.descricao.errors?.length ? (
          <p className="text-destructive text-sm">{fields.descricao.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.systemPrompt.id}>System prompt</Label>
        <Textarea
          {...getTextareaProps(fields.systemPrompt)}
          key={fields.systemPrompt.key}
          rows={10}
          required
          placeholder="Você é um agente da empresa X. Sua função é..."
        />
        <p className="text-muted-foreground text-xs">
          Instruções base do agente. Ainda em rascunho — publish (criar AgentVersion) chega na
          próxima fatia.
        </p>
        {fields.systemPrompt.errors?.length ? (
          <p className="text-destructive text-sm">{fields.systemPrompt.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href="/agents">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar agente" : "Salvar rascunho"}
        </Button>
      </div>
    </form>
  );
}
