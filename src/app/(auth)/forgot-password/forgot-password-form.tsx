"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/auth/forgot-password-action";
import { forgotPasswordSchema } from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [lastResult, action, pending] = useActionState(forgotPasswordAction, undefined);
  const [submitted, setSubmitted] = useState(false);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: forgotPasswordSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  // Após submit com sucesso (sem erros), mostra mensagem fixa.
  const showSuccess = submitted && !form.errors?.length;

  return (
    <form
      {...getFormProps(form)}
      action={(formData) => {
        setSubmitted(true);
        action(formData);
      }}
      className="flex flex-col gap-4"
    >
      {showSuccess ? (
        <Alert>
          <AlertDescription>
            Se este email estiver cadastrado, você receberá um link para redefinir a senha.
          </AlertDescription>
        </Alert>
      ) : null}

      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.email.id}>Email</Label>
          <Input
            {...getInputProps(fields.email, { type: "email" })}
            key={fields.email.key}
            placeholder="você@empresa.com"
            autoComplete="email"
            required
          />
          {fields.email.errors?.length ? (
            <p className="text-destructive text-sm">{fields.email.errors.join(" ")}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de redefinição"}
      </Button>

      <div className="border-border border-t pt-4">
        <p className="text-muted-foreground text-center text-sm">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-accent-light hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </form>
  );
}
