"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
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
import { addMemberAction } from "@/features/members/add-action";
import { addMemberInputSchema, ROLE_LABEL } from "@/features/members/schemas";

type Props = {
  canCreateOwner: boolean;
};

export function AddMemberForm({ canCreateOwner }: Props) {
  const [lastResult, formAction, pending] = useActionState(addMemberAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: addMemberInputSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const roles = (Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).filter(
    (r) => canCreateOwner || r !== "tenant_owner",
  );

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-4">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.email.id}>Email da pessoa</Label>
          <Input
            {...getInputProps(fields.email, { type: "email" })}
            key={fields.email.key}
            placeholder="pessoa@empresa.com"
            required
          />
          {fields.email.errors?.length ? (
            <p className="text-destructive text-sm">{fields.email.errors.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.role.id}>Papel</Label>
          <Select name={fields.role.name} defaultValue="operator">
            <SelectTrigger id={fields.role.id} className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="invisible">.</Label>
          <Button type="submit" disabled={pending}>
            {pending ? "..." : "Adicionar"}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        V1: a pessoa precisa ter feito signup antes (com este email). Convite por email chega em
        fatia futura quando Resend integrar.
      </p>
    </form>
  );
}
