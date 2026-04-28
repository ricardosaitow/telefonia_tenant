"use client";

import { getFormProps, getInputProps, getTextareaProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDepartmentAction } from "@/features/departments/create-action";
import { departmentInputSchema, updateDepartmentInputSchema } from "@/features/departments/schemas";
import { updateDepartmentAction } from "@/features/departments/update-action";

type DepartmentFormProps = {
  mode: "create" | "edit";
  defaultValues?: {
    id: string;
    nome: string;
    descricao: string | null;
  };
};

export function DepartmentForm({ mode, defaultValues }: DepartmentFormProps) {
  const action = mode === "create" ? createDepartmentAction : updateDepartmentAction;
  const schema = mode === "create" ? departmentInputSchema : updateDepartmentInputSchema;

  const [lastResult, formAction, pending] = useActionState(action, undefined);

  const [form, fields] = useForm({
    lastResult,
    defaultValue: defaultValues
      ? {
          nome: defaultValues.nome,
          descricao: defaultValues.descricao ?? "",
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
        <Label htmlFor={fields.nome.id}>Nome do departamento</Label>
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
        <Label htmlFor={fields.descricao.id}>Descrição (opcional)</Label>
        <textarea
          {...getTextareaProps(fields.descricao)}
          key={fields.descricao.key}
          rows={3}
          maxLength={500}
          className="border-glass-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:border-accent-light focus-visible:shadow-glow w-full min-w-0 rounded-md border px-3 py-2 text-sm transition-[border-color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {fields.descricao.errors?.length ? (
          <p className="text-destructive text-sm">{fields.descricao.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href="/departments">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar departamento" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
