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
import { accountProfileInputSchema } from "@/features/account/schemas";
import { updateAccountProfileAction } from "@/features/account/update-profile-action";
import { LOCALE_LABEL, LOCALE_VALUES } from "@/features/tenant-settings/schemas";

type Props = {
  initial: { nome: string; locale: string };
};

export function ProfileForm({ initial }: Props) {
  const [lastResult, formAction, pending] = useActionState(updateAccountProfileAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: accountProfileInputSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: initial,
  });

  const saved = lastResult?.status === "success";

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-4">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert>
          <AlertDescription>Salvo.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fields.nome.id}>Nome</Label>
        <Input {...getInputProps(fields.nome, { type: "text" })} key={fields.nome.key} required />
        {fields.nome.errors?.length ? (
          <p className="text-destructive text-sm">{fields.nome.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fields.locale.id}>Idioma do portal</Label>
        <Select name={fields.locale.name} defaultValue={initial.locale}>
          <SelectTrigger id={fields.locale.id} className="sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALE_VALUES.map((l) => (
              <SelectItem key={l} value={l}>
                {LOCALE_LABEL[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
