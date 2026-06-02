import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { servicesApi } from "./api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceDTO } from "@bymariap/types";

const schema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1),
  priceCop: z.coerce.number().int().min(0),
  status: z.enum(["draft", "published", "archived"]),
});
type FormValues = z.infer<typeof schema>;

export function ServiceFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ServiceDTO | null;
}) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      durationMinutes: 45,
      priceCop: 0,
      status: "draft",
    },
  });

  useEffect(() => {
    form.reset(
      editing
        ? {
            name: editing.name,
            slug: editing.slug,
            description: editing.description ?? "",
            durationMinutes: editing.durationMinutes,
            priceCop: editing.priceCop,
            status: editing.status,
          }
        : {
            name: "",
            slug: "",
            description: "",
            durationMinutes: 45,
            priceCop: 0,
            status: "draft",
          },
    );
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      editing
        ? servicesApi.update(editing.id, v)
        : servicesApi.create(v),
    onSuccess: () => {
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["services"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar servicio" : "Nuevo servicio"}
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
        <div className="space-y-1">
          <Label>Descripción</Label>
          <Textarea {...form.register("description")} rows={3} />
        </div>
        <div className="space-y-1">
          <Label>Duración (minutos)</Label>
          <Input type="number" {...form.register("durationMinutes")} />
        </div>
        <div className="space-y-1">
          <Label>Precio (COP)</Label>
          <Input type="number" {...form.register("priceCop")} />
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select {...form.register("status")}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </Select>
        </div>
        <Button type="submit" disabled={save.isPending}>
          Guardar
        </Button>
      </form>
    </Dialog>
  );
}
