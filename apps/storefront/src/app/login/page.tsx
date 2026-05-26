"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useLogin } from "@/lib/auth/hooks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

function LoginContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/mi-cuenta";
  const login = useLogin();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(v: z.infer<typeof schema>) {
    try {
      await login.mutateAsync(v);
      router.replace(next);
    } catch (e: unknown) {
      toast.error(
        (e as { message?: string })?.message ?? "Credenciales inválidas",
      );
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 bg-background">
      <div
        className="w-full max-w-sm bg-white rounded-md p-8 space-y-6"
        style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
      >
        <div className="text-center space-y-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Bienvenida de nuevo
          </h1>
          <p className="text-xs font-body text-muted-foreground">
            Inicia sesión para ver tus pedidos y gestionar tu cuenta
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              placeholder="tu@correo.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
            <div className="mt-1 text-right">
              <span className="text-xs font-body text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                ¿Olvidaste tu contraseña?
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {form.formState.isSubmitting ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-muted" />
          <span className="text-xs font-body text-muted-foreground">o</span>
          <div className="flex-1 h-px bg-muted" />
        </div>

        <button
          type="button"
          className="w-full h-12 rounded-full border border-border bg-background font-body text-sm text-foreground hover:bg-muted transition-colors"
          onClick={() => router.replace(next)}
        >
          Continuar como invitado
        </button>

        <p className="text-center text-xs font-body text-muted-foreground">
          ¿Primera vez aquí?{" "}
          <span className="text-foreground underline cursor-pointer">
            Regístrate
          </span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <p className="text-sm font-body text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
