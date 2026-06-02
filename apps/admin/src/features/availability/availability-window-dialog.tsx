import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { availabilityApi } from "./api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// Export for use in page
export { minutesToTime };

export function AvailabilityWindowDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");

  const publish = useMutation({
    mutationFn: () =>
      availabilityApi.publish({
        date,
        startMinute: timeToMinutes(startTime),
        endMinute: timeToMinutes(endTime),
      }),
    onSuccess: () => {
      toast.success("Disponibilidad publicada");
      qc.invalidateQueries({ queryKey: ["availability"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error("Selecciona una fecha");
      return;
    }
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      toast.error("La hora de fin debe ser posterior a la de inicio");
      return;
    }
    publish.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publicar disponibilidad"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Hora de inicio</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Hora de fin</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={publish.isPending}>
          Publicar
        </Button>
      </form>
    </Dialog>
  );
}
