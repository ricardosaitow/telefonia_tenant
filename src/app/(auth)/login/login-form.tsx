"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/login-action";
import { signinSchema } from "@/features/auth/schemas";

type LoginFormProps = {
  signupSuccess: boolean;
};

export function LoginForm({ signupSuccess }: LoginFormProps) {
  const [lastResult, action, pending] = useActionState(loginAction, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: signinSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <form {...getFormProps(form)} action={action} className="flex flex-col gap-4">
      {signupSuccess ? (
        <Alert>
          <AlertDescription>Cadastro realizado. Faça login pra continuar.</AlertDescription>
        </Alert>
      ) : null}

      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.email.id}>Email</Label>
        <Input
          {...getInputProps(fields.email, { type: "email" })}
          key={fields.email.key}
          autoComplete="email"
          required
        />
        {fields.email.errors?.length ? (
          <p className="text-destructive text-sm">{fields.email.errors.join(" ")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fields.password.id}>Senha</Label>
        <Input
          {...getInputProps(fields.password, { type: "password" })}
          key={fields.password.key}
          autoComplete="current-password"
          required
        />
        {fields.password.errors?.length ? (
          <p className="text-destructive text-sm">{fields.password.errors.join(" ")}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Não tem conta?{" "}
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
