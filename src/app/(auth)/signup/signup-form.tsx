"use client";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema } from "@/features/auth/schemas";
import { signupFormAction } from "@/features/auth/signup-form-action";

export function SignupForm() {
  const [lastResult, action, pending] = useActionState(signupFormAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: signupSchema });
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

      <input type="hidden" name="locale" value="pt-BR" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.nome.id}>Nome</Label>
          <Input
            {...getInputProps(fields.nome, { type: "text" })}
            key={fields.nome.key}
            placeholder="Seu nome completo"
            autoComplete="name"
            required
          />
          {fields.nome.errors?.length ? (
            <p className="text-destructive text-sm">{fields.nome.errors.join(" ")}</p>
          ) : null}
        </div>

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
          <Label htmlFor={fields.password.id}>Senha</Label>
          <div className="relative">
            <Input
              {...getInputProps(fields.password, { type: showPassword ? "text" : "password" })}
              key={fields.password.key}
              autoComplete="new-password"
              required
              minLength={12}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-muted-foreground text-xs">Mínimo 12 caracteres.</p>
          {fields.password.errors?.length ? (
            <p className="text-destructive text-sm">{fields.password.errors.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fields.confirmPassword.id}>Confirmar senha</Label>
          <div className="relative">
            <Input
              {...getInputProps(fields.confirmPassword, {
                type: showConfirm ? "text" : "password",
              })}
              key={fields.confirmPassword.key}
              autoComplete="new-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label={showConfirm ? "Esconder senha" : "Mostrar senha"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fields.confirmPassword.errors?.length ? (
            <p className="text-destructive text-sm">{fields.confirmPassword.errors.join(" ")}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </Button>

      <div className="border-border border-t pt-4">
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="text-accent-light hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </form>
  );
}
