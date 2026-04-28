"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
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
import { createChannelAction } from "@/features/channels/create-action";
import {
  CHANNEL_TYPE_LABEL,
  channelInputSchema,
  updateChannelInputSchema,
} from "@/features/channels/schemas";
import { updateChannelAction } from "@/features/channels/update-action";

type ChannelType = keyof typeof CHANNEL_TYPE_LABEL;

const TYPE_HINTS: Record<ChannelType, string> = {
  voice_did: "DID em formato E.164 (ex.: +5511999999999)",
  whatsapp: "Número WhatsApp Business (ex.: +5511999999999)",
  email: "Endereço completo (ex.: atendimento@empresa.com)",
  webchat: "Identificador interno (ex.: site-principal)",
};

type ChannelFormProps = {
  mode: "create" | "edit";
  defaultValues?: {
    id: string;
    tipo: ChannelType;
    identificador: string;
    nomeAmigavel: string;
  };
};

export function ChannelForm({ mode, defaultValues }: ChannelFormProps) {
  const action = mode === "create" ? createChannelAction : updateChannelAction;
  const schema = mode === "create" ? channelInputSchema : updateChannelInputSchema;

  const [lastResult, formAction, pending] = useActionState(action, undefined);

  const [form, fields] = useForm({
    lastResult,
    defaultValue: defaultValues
      ? {
          tipo: defaultValues.tipo,
          identificador: defaultValues.identificador,
          nomeAmigavel: defaultValues.nomeAmigavel,
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
        <Label htmlFor={fields.tipo.id}>Tipo de canal</Label>
        <Select name={fields.tipo.name} defaultValue={defaultValues?.tipo}>
          <SelectTrigger
            id={fields.tipo.id}
            aria-invalid={fields.tipo.errors?.length ? true : undefined}
          >
            <SelectValue placeholder="Escolha o tipo" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CHANNEL_TYPE_LABEL) as ChannelType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {CHANNEL_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fields.tipo.errors?.length ? (
          <p className="text-destructive text-sm">{fields.tipo.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.identificador.id}>Identificador</Label>
        <Input
          {...getInputProps(fields.identificador, { type: "text" })}
          key={fields.identificador.key}
          autoComplete="off"
          required
        />
        <p className="text-muted-foreground text-xs">
          {defaultValues?.tipo
            ? TYPE_HINTS[defaultValues.tipo]
            : "Depende do tipo escolhido — DID, número WA, email ou identificador interno."}
        </p>
        {fields.identificador.errors?.length ? (
          <p className="text-destructive text-sm">{fields.identificador.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.nomeAmigavel.id}>Nome amigável</Label>
        <Input
          {...getInputProps(fields.nomeAmigavel, { type: "text" })}
          key={fields.nomeAmigavel.key}
          autoComplete="off"
          required
          placeholder="Ex.: Comercial — Linha SP"
        />
        {fields.nomeAmigavel.errors?.length ? (
          <p className="text-destructive text-sm">{fields.nomeAmigavel.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href="/channels">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar canal" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
