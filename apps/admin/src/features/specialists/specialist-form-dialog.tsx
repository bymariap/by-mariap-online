import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { specialistsApi, SpecialistRow } from "./api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FormValues {
  userId: string;
  bio: string;
  specialties: string;
  avatarUrl: string;
}

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
          <Label>User ID (debe tener rol "specialist")</Label>
          <Input {...form.register("userId")} disabled={Boolean(editing)} />
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
