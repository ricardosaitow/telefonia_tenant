"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTenantAction } from "@/features/tenants/create-tenant-action";
import { createTenantSchema } from "@/features/tenants/schemas";

/**
 * Form pra criar nova empresa. Usado em dois contextos:
 *  - /tenants quando user tem 0 memberships (fallback pra account legada
 *    ou convite revogado).
 *  - "+ Nova empresa" no header (futuro).
 */
export function CreateTenantForm() {
  const [lastResult, action, pending] = useActionState(createTenantAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createTenantSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={action} className="flex flex-col gap-4">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.nomeTenant.id}>Nome da empresa</Label>
        <Input
          {...getInputProps(fields.nomeTenant, { type: "text" })}
          key={fields.nomeTenant.key}
          autoComplete="organization"
          required
          autoFocus
        />
        {fields.nomeTenant.errors?.length ? (
          <p className="text-destructive text-sm">{fields.nomeTenant.errors.join(" ")}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar empresa"}
      </Button>
    </form>
  );
}
