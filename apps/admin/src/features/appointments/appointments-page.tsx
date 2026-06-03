import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppointmentDTO, AppointmentStatus } from "@bymariap/types";
import { appointmentsApi } from "./api";
import { specialistsApi } from "@/features/specialists/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Calendar, type CalendarBlock, type CalendarColumn, type CalendarView, visibleRange,
} from "@/components/calendar/calendar";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "#c79a82",
  completed: "#8c9b7e",
  no_show: "#56606a",
  cancelled: "#b0aab0",
};
const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Agendada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};
const statusOptions: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "scheduled", label: "Agendadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "No asistió" },
];
const bogotaFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short",
});

// local Bogota date range (YYYY-MM-DD) -> UTC ISO bounds for the backend.
function rangeToUtc(from: string, to: string) {
  const fromUtc = new Date(`${from}T05:00:00.000Z`); // 00:00 Bogota
  const toUtc = new Date(`${to}T05:00:00.000Z`);
  toUtc.setUTCDate(toUtc.getUTCDate() + 1); // exclusive end of last day
  return { from: fromUtc.toISOString(), to: toUtc.toISOString() };
}

export function AppointmentsPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [view, setView] = useState<CalendarView>("day");
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);

  const range = useMemo(() => visibleRange(view, date), [view, date]);
  const utc = useMemo(() => rangeToUtc(range.from, range.to), [range]);

  const specialists = useQuery({ queryKey: ["specialists"], queryFn: specialistsApi.list });

  const list = useQuery({
    queryKey: ["appointments", statusFilter, utc.from, utc.to, mode],
    queryFn: () =>
      appointmentsApi.list(
        mode === "calendar"
          ? { status: statusFilter || undefined, from: utc.from, to: utc.to }
          : { status: statusFilter || undefined },
      ),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.setStatus(id, status),
    onSuccess: () => {
      toast.success("Estado actualizado");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const columns: CalendarColumn[] = (specialists.data ?? []).map((s) => ({
    key: s.id, label: s.user.fullName.split(" ")[0],
  }));

  const blocks: CalendarBlock[] = (list.data ?? []).map((a) => ({
    id: a.id,
    start: a.scheduledAt,
    end: new Date(new Date(a.scheduledAt).getTime() + a.durationMinutes * 60000).toISOString(),
    label: `${a.serviceName} · ${a.guestFullName ?? "Cliente"}`,
    color: STATUS_COLOR[a.status],
    columnKey: a.specialistId,
  }));

  const selectedFull = selected;

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Citas</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | "")} className="w-40">
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden text-sm">
            <button onClick={() => setMode("calendar")} className={mode === "calendar" ? "px-3 py-1 bg-foreground text-background" : "px-3 py-1 text-muted-foreground"}>Calendario</button>
            <button onClick={() => setMode("list")} className={mode === "list" ? "px-3 py-1 bg-foreground text-background" : "px-3 py-1 text-muted-foreground"}>Lista</button>
          </div>
        </div>
      </header>

      {mode === "calendar" && (
        <Calendar
          view={view}
          date={date}
          blocks={blocks}
          columns={view === "day" ? columns : undefined}
          onViewChange={setView}
          onDateChange={setDate}
          onSelectBlock={(id) => setSelected((list.data ?? []).find((a) => a.id === id) ?? null)}
        />
      )}

      {mode === "list" && (
        <>
          {list.data && list.data.length === 0 && (
            <p className="text-muted-foreground text-sm">Sin citas para este filtro.</p>
          )}
          {list.data && list.data.length > 0 && (
            <Table>
              <THead>
                <TR><TH>Fecha</TH><TH>Cliente</TH><TH>Servicio</TH><TH>Especialista</TH><TH>Estado</TH><TH>Acciones</TH></TR>
              </THead>
              <TBody>
                {list.data.map((a) => (
                  <TR key={a.id}>
                    <TD>{bogotaFmt.format(new Date(a.scheduledAt))}</TD>
                    <TD className="text-sm">{a.guestFullName ?? a.guestEmail ?? a.customerId ?? "—"}</TD>
                    <TD>{a.serviceName}</TD>
                    <TD>{a.specialistName}</TD>
                    <TD className="text-muted-foreground">{statusLabels[a.status]}</TD>
                    <TD>
                      {a.status === "scheduled" && (
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "completed" })} disabled={setStatus.isPending}>Completada</Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "no_show" })} disabled={setStatus.isPending}>No asistió</Button>
                          <Button size="sm" variant="destructive" onClick={() => confirm("¿Cancelar cita?") && setStatus.mutate({ id: a.id, status: "cancelled" })} disabled={setStatus.isPending}>Cancelar</Button>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}

      {selectedFull && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-background rounded-lg p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{selectedFull.serviceName}</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{bogotaFmt.format(new Date(selectedFull.scheduledAt))} · {selectedFull.specialistName}</p>
              <p>{selectedFull.guestFullName ?? selectedFull.guestEmail ?? "Cliente"}</p>
              {selectedFull.guestPhone && <p>Tel: {selectedFull.guestPhone}</p>}
              <p>Estado: {statusLabels[selectedFull.status]}</p>
            </div>
            {selectedFull.status === "scheduled" && (
              <div className="flex flex-col gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: selectedFull.id, status: "completed" })} disabled={setStatus.isPending}>Marcar completada</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: selectedFull.id, status: "no_show" })} disabled={setStatus.isPending}>No asistió</Button>
                <Button size="sm" variant="destructive" onClick={() => confirm("¿Cancelar cita?") && setStatus.mutate({ id: selectedFull.id, status: "cancelled" })} disabled={setStatus.isPending}>Cancelar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
