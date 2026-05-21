import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi, rolesApi, UserRow } from "./api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roleId: z.string().min(1),
});
const updateSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roleId: z.string().min(1),
});

export function UserFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: UserRow | null;
}) {
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list });
  const isEdit = Boolean(editing);

  const form = useForm<any>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
  });

  useEffect(() => {
    if (editing)
      form.reset({
        fullName: editing.fullName,
        phone: editing.phone ?? "",
        roleId: editing.roleId,
      });
    else
      form.reset({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        roleId: "",
      });
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: any) =>
      isEdit ? usersApi.update(editing!.id, v) : usersApi.create(v),
    onSuccess: () => {
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
    >
      <form
        onSubmit={form.handleSubmit((v) => save.mutate(v))}
        className="space-y-3"
      >
        {!isEdit && (
          <>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-1">
              <Label>Contraseña</Label>
              <Input type="password" {...form.register("password")} />
            </div>
          </>
        )}
        <div className="space-y-1">
          <Label>Nombre completo</Label>
          <Input {...form.register("fullName")} />
        </div>
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input {...form.register("phone")} />
        </div>
        <div className="space-y-1">
          <Label>Rol</Label>
          <Select {...form.register("roleId")}>
            <option value="">—</option>
            {roles.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={save.isPending}>
          Guardar
        </Button>
      </form>
    </Dialog>
  );
}
