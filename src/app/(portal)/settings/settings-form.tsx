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
import {
  LOCALE_LABEL,
  LOCALE_VALUES,
  tenantSettingsInputSchema,
} from "@/features/tenant-settings/schemas";
import { updateTenantSettingsAction } from "@/features/tenant-settings/update-action";

type Props = {
  initial: {
    nomeFantasia: string;
    razaoSocial: string | null;
    cnpj: string | null;
    dominioEmailPrincipal: string | null;
    defaultLocale: string;
  };
};

export function SettingsForm({ initial }: Props) {
  const [lastResult, formAction, pending] = useActionState(updateTenantSettingsAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: tenantSettingsInputSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      nomeFantasia: initial.nomeFantasia,
      razaoSocial: initial.razaoSocial ?? "",
      cnpj: initial.cnpj ?? "",
      dominioEmailPrincipal: initial.dominioEmailPrincipal ?? "",
      defaultLocale: initial.defaultLocale,
    },
  });

  const saved = lastResult?.status === "success";

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-5">
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
        <Label htmlFor={fields.nomeFantasia.id}>Nome fantasia</Label>
        <Input
          {...getInputProps(fields.nomeFantasia, { type: "text" })}
          key={fields.nomeFantasia.key}
          required
        />
        {fields.nomeFantasia.errors?.length ? (
          <p className="text-destructive text-sm">{fields.nomeFantasia.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fields.razaoSocial.id}>
          Razão social <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          {...getInputProps(fields.razaoSocial, { type: "text" })}
          key={fields.razaoSocial.key}
        />
        {fields.razaoSocial.errors?.length ? (
          <p className="text-destructive text-sm">{fields.razaoSocial.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.cnpj.id}>
            CNPJ <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            {...getInputProps(fields.cnpj, { type: "text" })}
            key={fields.cnpj.key}
            placeholder="00.000.000/0000-00"
          />
          {fields.cnpj.errors?.length ? (
            <p className="text-destructive text-sm">{fields.cnpj.errors.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.dominioEmailPrincipal.id}>
            Domínio de email principal <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            {...getInputProps(fields.dominioEmailPrincipal, { type: "text" })}
            key={fields.dominioEmailPrincipal.key}
            placeholder="empresa.com.br"
          />
          {fields.dominioEmailPrincipal.errors?.length ? (
            <p className="text-destructive text-sm">
              {fields.dominioEmailPrincipal.errors.join(" ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fields.defaultLocale.id}>Idioma padrão</Label>
        <Select name={fields.defaultLocale.name} defaultValue={initial.defaultLocale}>
          <SelectTrigger id={fields.defaultLocale.id} className="sm:w-72">
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
        <p className="text-muted-foreground text-xs">
          Idioma padrão pra agentes e templates do tenant. Cada conversa pode usar outro (resolução
          por escopo).
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
