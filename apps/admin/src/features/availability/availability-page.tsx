import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AvailabilityWindowDTO } from "@bymariap/types";
import { availabilityApi } from "./api";
import { AvailabilityWindowDialog, minutesToTime } from "./availability-window-dialog";
import { specialistsApi } from "@/features/specialists/api";
import { useMe } from "@/features/auth/use-me";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Calendar, type CalendarBlock, type CalendarView, visibleRange } from "@/components/calendar/calendar";

// Availability windows store local Bogota minutes on a local date. Build the
// UTC ISO instants the Calendar expects: local Bogota is UTC-5 (no DST).
function windowToBlock(w: AvailabilityWindowDTO): CalendarBlock {
  const day = w.date.slice(0, 10);
  const toIso = (min: number) => {
    const utcMin = min + 5 * 60; // local -> UTC (+5h)
    const hh = String(Math.floor(utcMin / 60) % 24).padStart(2, "0");
    const mm = String(utcMin % 60).padStart(2, "0");
    const dayShift = Math.floor(utcMin / 60 / 24); // crosses midnight if late
    const d = new Date(`${day}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + dayShift);
    return `${d.toISOString().slice(0, 10)}T${hh}:${mm}:00.000Z`;
  };
  return {
    id: w.id,
    start: toIso(w.startMinute),
    end: toIso(w.endMinute),
    label: `${minutesToTime(w.startMinute)}–${minutesToTime(w.endMinute)}`,
    color: "#c79a82",
  };
}

export function AvailabilityPage() {
  const me = useMe();
  const qc = useQueryClient();
  const isAdmin = me.data?.role.name === "admin";

  const [view, setView] = useState<CalendarView>("week");
  const [date, setDate] = useState(new Date());
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ date: string; startMinute: number } | null>(null);

  // Admin: list of specialists for the selector.
  const specialists = useQuery({
    queryKey: ["specialists"],
    queryFn: specialistsApi.list,
    enabled: isAdmin,
  });

  // The specialist whose agenda we manage: admin picks one; specialist = self.
  const targetSpecialistId = isAdmin ? selectedSpecialist : (me.data?.specialist?.id ?? "");
  const range = useMemo(() => visibleRange(view, date), [view, date]);

  const windows = useQuery({
    queryKey: ["availability", targetSpecialistId, range.from, range.to, isAdmin],
    queryFn: () =>
      isAdmin
        ? availabilityApi.listForSpecialist(targetSpecialistId, range.from, range.to)
        : availabilityApi.listMine(range.from, range.to),
    enabled: isAdmin ? Boolean(targetSpecialistId) : Boolean(me.data?.specialist),
  });

  const remove = useMutation({
    mutationFn: (id: string) => (isAdmin ? availabilityApi.removeAny(id) : availabilityApi.removeMine(id)),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (me.data && !isAdmin && !me.data.specialist) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta sección es para usuarios con perfil de especialista. Pide a un
        administrador que te asigne uno desde &quot;Especialistas&quot;.
      </p>
    );
  }

  const blocks = (windows.data ?? []).map(windowToBlock);

  function openCreate(p: { date: string; startMinute: number } | null) {
    if (isAdmin && !targetSpecialistId) {
      toast.error("Selecciona un especialista primero");
      return;
    }
    setPrefill(p);
    setDialogOpen(true);
  }

  function onSelectBlock(id: string) {
    if (confirm("¿Eliminar esta disponibilidad?")) remove.mutate(id);
  }

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Mi agenda</h1>
        <Button onClick={() => openCreate(null)}>+ Publicar disponibilidad</Button>
      </header>

      <Calendar
        view={view}
        date={date}
        blocks={blocks}
        onViewChange={setView}
        onDateChange={setDate}
        onSelectDate={(dayKey, minute) => openCreate({ date: dayKey, startMinute: minute })}
        onSelectBlock={onSelectBlock}
        rightSlot={
          isAdmin ? (
            <Select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="w-56"
            >
              <option value="">Selecciona especialista…</option>
              {specialists.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.fullName}
                </option>
              ))}
            </Select>
          ) : null
        }
      />

      {dialogOpen && (
        <AvailabilityWindowDialog
          key={`${prefill?.date ?? "new"}-${prefill?.startMinute ?? 0}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          specialistId={isAdmin ? targetSpecialistId : null}
          prefill={prefill}
        />
      )}
    </div>
  );
}
