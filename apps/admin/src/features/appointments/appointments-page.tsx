import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsApi } from "./api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { AppointmentStatus } from "@bymariap/types";

const statusOptions: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "scheduled", label: "Programadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "No asistió" },
];

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const bogotaFmt = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function AppointmentsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");

  const list = useQuery({
    queryKey: ["appointments", statusFilter],
    queryFn: () =>
      appointmentsApi.list(statusFilter === "" ? undefined : statusFilter),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.setStatus(id, status),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Citas</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Estado</label>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as AppointmentStatus | "")
            }
            className="w-44"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {list.data && list.data.length === 0 && (
        <p className="text-muted-foreground text-sm">Sin citas para este filtro.</p>
      )}

      {list.data && list.data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Cliente</TH>
              <TH>Servicio</TH>
              <TH>Especialista</TH>
              <TH>Estado</TH>
              <TH>Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((a) => (
              <TR key={a.id}>
                <TD>{bogotaFmt.format(new Date(a.scheduledAt))}</TD>
                <TD className="text-sm">
                  {a.guestFullName ?? a.guestEmail ?? a.customerId ?? "—"}
                </TD>
                <TD>{a.serviceName}</TD>
                <TD>{a.specialistName}</TD>
                <TD className="text-muted-foreground">
                  {statusLabels[a.status]}
                </TD>
                <TD>
                  {a.status === "scheduled" && (
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStatus.mutate({ id: a.id, status: "completed" })
                        }
                        disabled={setStatus.isPending}
                      >
                        Completada
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStatus.mutate({ id: a.id, status: "no_show" })
                        }
                        disabled={setStatus.isPending}
                      >
                        No asistió
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          confirm("¿Cancelar cita?") &&
                          setStatus.mutate({ id: a.id, status: "cancelled" })
                        }
                        disabled={setStatus.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
