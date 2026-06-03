import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { specialistsApi, SpecialistRow } from "./api";
import { usersApi } from "@/features/users/api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FormValues {
  userId: string;
  bio: string;
  specialties: string;
  avatarUrl: string;
}

// Roles whose users can be turned into bookable specialists. The owner-admin
// who also provides services is a valid case, so admin is eligible too.
const ELIGIBLE_ROLES = ["specialist", "admin"];

export function SpecialistFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: SpecialistRow | null;
}) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    defaultValues: { userId: "", bio: "", specialties: "", avatarUrl: "" },
  });

  const users = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    enabled: open && !editing,
  });
  const existing = useQuery({
    queryKey: ["specialists"],
    queryFn: specialistsApi.list,
    enabled: open && !editing,
  });

  const assignedUserIds = new Set((existing.data ?? []).map((s) => s.userId));
  const eligibleUsers = (users.data ?? []).filter(
    (u) => ELIGIBLE_ROLES.includes(u.role.name) && !assignedUserIds.has(u.id),
  );

  useEffect(() => {
    if (editing)
      form.reset({
        userId: editing.userId,
        bio: editing.bio ?? "",
        specialties: editing.specialties.join(", "),
        avatarUrl: editing.avatarUrl ?? "",
      });
    else form.reset({ userId: "", bio: "", specialties: "", avatarUrl: "" });
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      specialistsApi.upsert(v.userId, {
        bio: v.bio || undefined,
        specialties: v.specialties
          ? v.specialties
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        avatarUrl: v.avatarUrl || undefined,
      }),
    onSuccess: () => {
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["specialists"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar especialista" : "Asignar perfil"}
    >
      <form
        onSubmit={form.handleSubmit((v) => save.mutate(v))}
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label>Usuario</Label>
          {editing ? (
            <Input value={editing.user.fullName} disabled />
          ) : (
            <Select
              {...form.register("userId", { required: true })}
              defaultValue=""
            >
              <option value="" disabled>
                {eligibleUsers.length === 0
                  ? "No hay usuarios disponibles"
                  : "Selecciona un usuario…"}
              </option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} · {u.email} ({u.role.name})
                </option>
              ))}
            </Select>
          )}
          {!editing && eligibleUsers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Crea primero un usuario con rol &quot;specialist&quot; (o usa una
              cuenta admin) que aún no tenga perfil.
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Bio</Label>
          <Textarea {...form.register("bio")} />
        </div>
        <div className="space-y-1">
          <Label>Especialidades (separadas por coma)</Label>
          <Input {...form.register("specialties")} />
        </div>
        <div className="space-y-1">
          <Label>Avatar URL</Label>
          <Input {...form.register("avatarUrl")} />
        </div>
        <Button type="submit" disabled={save.isPending}>
          Guardar
        </Button>
      </form>
    </Dialog>
  );
}
