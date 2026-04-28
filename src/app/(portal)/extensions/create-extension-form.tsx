"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExtensionAction } from "@/features/extensions/create-action";
import { createExtensionSchema } from "@/features/extensions/schemas";

export function CreateExtensionForm() {
  const [lastResult, formAction, pending] = useActionState(createExtensionAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createExtensionSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form
      {...getFormProps(form)}
      action={formAction}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor={fields.extension.id}>Número do ramal</Label>
        <Input
          {...getInputProps(fields.extension, { type: "text" })}
          key={fields.extension.key}
          autoComplete="off"
          placeholder="1001"
          inputMode="numeric"
          required
        />
        {fields.extension.errors?.length ? (
          <p className="text-destructive text-sm">{fields.extension.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor={fields.displayName.id}>Nome (opcional)</Label>
        <Input
          {...getInputProps(fields.displayName, { type: "text" })}
          key={fields.displayName.key}
          autoComplete="off"
          placeholder="Recepção"
        />
        {fields.displayName.errors?.length ? (
          <p className="text-destructive text-sm">{fields.displayName.errors.join(" ")}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar ramal"}
      </Button>

      {form.errors?.length ? (
        <Alert variant="destructive" className="w-full sm:w-auto">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
