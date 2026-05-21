import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi, UserRow } from "./api";
import { UserFormDialog } from "./user-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export function UsersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const remove = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Nuevo
        </Button>
      </header>
      {list.data && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Email</TH>
              <TH>Rol</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((u) => (
              <TR key={u.id}>
                <TD>{u.fullName}</TD>
                <TD className="text-muted-foreground">{u.email}</TD>
                <TD>
                  <Badge>{u.role.name}</Badge>
                </TD>
                <TD className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(u);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirm("¿Eliminar?") && remove.mutate(u.id)}
                  >
                    Eliminar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <UserFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
