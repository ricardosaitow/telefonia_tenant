"use client";

import { getFormProps, getInputProps, getTextareaProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useActionState, useState } from "react";

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
import { deleteTemplateAction } from "@/features/templates/delete-action";
import { updateTemplateInputSchema } from "@/features/templates/schemas";
import { updateTemplateAction } from "@/features/templates/update-action";
import { LOCALE_LABEL, LOCALE_VALUES } from "@/features/tenant-settings/schemas";

type Props = {
  template: {
    id: string;
    key: string;
    locale: string;
    content: string;
  };
};

export function EditTemplateForm({ template }: Props) {
  const [editing, setEditing] = useState(false);
  const [lastResult, formAction, pending] = useActionState(updateTemplateAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateTemplateInputSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      id: template.id,
      key: template.key,
      locale: template.locale,
      content: template.content,
    },
  });

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-foreground font-mono text-xs">{template.key}</p>
          <p className="text-muted-foreground text-xs">{template.locale}</p>
          <p className="text-foreground mt-2 text-sm whitespace-pre-wrap">{template.content}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <form action={deleteTemplateAction}>
            <input type="hidden" name="id" value={template.id} />
            <Button type="submit" variant="ghost" size="sm">
              Apagar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form {...getFormProps(form)} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name={fields.id.name} value={template.id} />

      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.key.id}>Chave</Label>
          <Input {...getInputProps(fields.key, { type: "text" })} key={fields.key.key} required />
          {fields.key.errors?.length ? (
            <p className="text-destructive text-sm">{fields.key.errors.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fields.locale.id}>Idioma</Label>
          <Select name={fields.locale.name} defaultValue={template.locale}>
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
          required
        />
        {fields.content.errors?.length ? (
          <p className="text-destructive text-sm">{fields.content.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
