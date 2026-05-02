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
  resetSuccess: boolean;
  next?: string;
};

export function LoginForm({ signupSuccess, resetSuccess, next }: LoginFormProps) {
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
          <AlertDescription>Conta criada. Faça login pra continuar.</AlertDescription>
        </Alert>
      ) : null}

      {resetSuccess ? (
        <Alert>
          <AlertDescription>Senha redefinida. Faça login com a nova senha.</AlertDescription>
        </Alert>
      ) : null}

      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={fields.password.id}>Senha</Label>
            <Link href="/forgot-password" className="text-accent-light text-sm hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
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
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <div className="border-border border-t pt-4">
        <p className="text-muted-foreground text-center text-sm">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="text-accent-light hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}
