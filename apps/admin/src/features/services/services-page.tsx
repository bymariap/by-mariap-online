import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { servicesApi } from "./api";
import { ServiceFormDialog } from "./service-form-dialog";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { ServiceDTO } from "@bymariap/types";

export function ServicesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["services"],
    queryFn: servicesApi.list,
  });

  const remove = useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Servicios</h1>
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
              <TH>Duración (min)</TH>
              <TH>Precio (COP)</TH>
              <TH>Estado</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((s) => (
              <TR key={s.id}>
                <TD>{s.name}</TD>
                <TD>{s.durationMinutes}</TD>
                <TD>{s.priceCop.toLocaleString("es-CO")}</TD>
                <TD className="text-muted-foreground">{s.status}</TD>
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
                      confirm("¿Eliminar?") && remove.mutate(s.id)
                    }
                  >
                    Eliminar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <ServiceFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
