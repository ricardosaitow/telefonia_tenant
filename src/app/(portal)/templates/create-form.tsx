"use client";

import { getFormProps, getInputProps, getTextareaProps, useForm } from "@conform-to/react";
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
import { Textarea } from "@/components/ui/textarea";
import { createTemplateAction } from "@/features/templates/create-action";
import { TEMPLATE_KEY_SUGGESTIONS, templateInputSchema } from "@/features/templates/schemas";
import { LOCALE_LABEL, LOCALE_VALUES } from "@/features/tenant-settings/schemas";

export function CreateTemplateForm() {
  const [lastResult, formAction, pending] = useActionState(createTemplateAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: templateInputSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-4">
      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.key.id}>Chave</Label>
          <Input
            {...getInputProps(fields.key, { type: "text" })}
            key={fields.key.key}
            list="template-key-suggestions"
            placeholder="out_of_hours"
            required
          />
          <datalist id="template-key-suggestions">
            {TEMPLATE_KEY_SUGGESTIONS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          {fields.key.errors?.length ? (
            <p className="text-destructive text-sm">{fields.key.errors.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.locale.id}>Idioma</Label>
          <Select name={fields.locale.name} defaultValue="pt-BR">
            <SelectTrigger id={fields.locale.id}>
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fields.content.id}>Conteúdo</Label>
        <Textarea
          {...getTextareaProps(fields.content)}
          key={fields.content.key}
          rows={4}
          placeholder="Olá! Estamos fora do horário de atendimento..."
          required
        />
        {fields.content.errors?.length ? (
          <p className="text-destructive text-sm">{fields.content.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar template"}
        </Button>
      </div>
    </form>
  );
}
