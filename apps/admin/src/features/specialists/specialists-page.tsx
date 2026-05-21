import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { specialistsApi, SpecialistRow } from "./api";
import { SpecialistFormDialog } from "./specialist-form-dialog";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export function SpecialistsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SpecialistRow | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["specialists"],
    queryFn: specialistsApi.list,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => specialistsApi.remove(userId),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["specialists"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Especialistas</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Asignar
        </Button>
      </header>
      {list.data && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Email</TH>
              <TH>Especialidades</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((s) => (
              <TR key={s.id}>
                <TD>{s.user.fullName}</TD>
                <TD className="text-muted-foreground">{s.user.email}</TD>
                <TD>{s.specialties.join(", ")}</TD>
                <TD className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      confirm("¿Quitar perfil?") && remove.mutate(s.userId)
                    }
                  >
                    Quitar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <SpecialistFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />
    </div>
  );
}
