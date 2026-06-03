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
export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  // when set, publish for this specialist via admin route; otherwise self.
  specialistId?: string | null;
  // optional prefill from clicking an empty cell
  prefill?: { date: string; startMinute: number } | null;
}

export function AvailabilityWindowDialog({ open, onOpenChange, specialistId, prefill }: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState(prefill?.date ?? "");
  const [startTime, setStartTime] = useState(prefill ? minutesToTime(prefill.startMinute) : "08:00");
  const [endTime, setEndTime] = useState("17:00");

  const publish = useMutation({
    mutationFn: () => {
      const data = { date, startMinute: timeToMinutes(startTime), endMinute: timeToMinutes(endTime) };
      return specialistId
        ? availabilityApi.publishFor(specialistId, data)
        : availabilityApi.publishMine(data);
    },
    onSuccess: () => {
      toast.success("Disponibilidad publicada");
      qc.invalidateQueries({ queryKey: ["availability"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return toast.error("Selecciona una fecha");
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return toast.error("La hora de fin debe ser posterior a la de inicio");
    }
    publish.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Publicar disponibilidad">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Hora de inicio</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Hora de fin</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
        <Button type="submit" disabled={publish.isPending}>Publicar</Button>
      </form>
    </Dialog>
  );
}
