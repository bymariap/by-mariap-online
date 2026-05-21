import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categoriesApi } from "./api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CategoryDTO } from "@bymariap/types";

const schema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});
type FormValues = z.infer<typeof schema>;

export function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: CategoryDTO | null;
}) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  useEffect(() => {
    form.reset(
      editing
        ? { name: editing.name, slug: editing.slug }
        : { name: "", slug: "" },
    );
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      editing ? categoriesApi.update(editing.id, v) : categoriesApi.create(v),
    onSuccess: () => {
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar categoría" : "Nueva categoría"}
    >
      <form
        onSubmit={form.handleSubmit((v) => save.mutate(v))}
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input {...form.register("name")} />
        </div>
        <div className="space-y-1">
          <Label>Slug</Label>
          <Input {...form.register("slug")} />
        </div>
        <Button type="submit" disabled={save.isPending}>
          Guardar
        </Button>
      </form>
    </Dialog>
  );
}
