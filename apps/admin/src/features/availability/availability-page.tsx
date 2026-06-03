import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { availabilityApi } from "./api";
import { AvailabilityWindowDialog, minutesToTime } from "./availability-window-dialog";
import { useMe } from "@/features/auth/use-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(mon), to: fmt(sun) };
}

export function AvailabilityPage() {
  const me = useMe();
  const qc = useQueryClient();
  const week = getWeekRange();
  const [fromDate, setFromDate] = useState(week.from);
  const [toDate, setToDate] = useState(week.to);
  const [dialogOpen, setDialogOpen] = useState(false);

  const list = useQuery({
    queryKey: ["availability", fromDate, toDate],
    queryFn: () => availabilityApi.listMine(fromDate, toDate),
    enabled: !!fromDate && !!toDate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => availabilityApi.remove(id),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (me.data && !me.data.specialist) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta sección es para usuarios con perfil de especialista. Pide a un
        administrador que te asigne uno desde &quot;Especialistas&quot;.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Mi agenda</h1>
        <Button onClick={() => setDialogOpen(true)}>Publicar disponibilidad</Button>
      </header>

      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <Label>Desde</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {list.data && list.data.length === 0 && (
        <p className="text-muted-foreground text-sm">Sin ventanas de disponibilidad en este período.</p>
      )}

      {list.data && list.data.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Inicio</TH>
              <TH>Fin</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((w) => (
              <TR key={w.id}>
                <TD>{w.date}</TD>
                <TD>{minutesToTime(w.startMinute)}</TD>
                <TD>{minutesToTime(w.endMinute)}</TD>
                <TD>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      confirm("¿Eliminar ventana?") && remove.mutate(w.id)
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

      <AvailabilityWindowDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
