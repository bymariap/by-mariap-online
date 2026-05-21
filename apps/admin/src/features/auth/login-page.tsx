import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await login(values.email, values.password);
      nav("/products", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-muted">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-background p-8 rounded-lg shadow w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold">by mariap — admin</h1>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <p className="text-xs text-destructive">
            {form.formState.errors.email?.message}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" {...form.register("password")} />
          <p className="text-xs text-destructive">
            {form.formState.errors.password?.message}
          </p>
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          Entrar
        </Button>
      </form>
    </div>
  );
}
