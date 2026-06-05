'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMe } from '@/lib/auth/hooks';
import { bookingApi } from '@/lib/booking/api';
import { AppointmentStatusPill } from '@/components/appointment-status-pill';
import type { AppointmentDTO } from '@bymariap/types';

function formatLocal(iso: string) {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export default function MisCitasPage() {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!me.isLoading && !me.data) router.replace('/login?next=/mi-cuenta/citas');
  }, [me.isLoading, me.data, router]);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['me-appointments'],
    queryFn: bookingApi.myAppointments,
    enabled: Boolean(me.data),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => bookingApi.cancelAppointment(id),
    onSuccess: () => {
      toast.success('Cita cancelada');
      qc.invalidateQueries({ queryKey: ['me-appointments'] });
    },
    onError: (e: unknown) => {
      const err = e as { body?: { code?: string }; message?: string };
      if (err?.body?.code === 'CANCELLATION_DEADLINE_PASSED') {
        toast.error('Solo puedes cancelar hasta 24h antes. Contáctanos.');
      } else {
        toast.error(err?.message ?? 'No se pudo cancelar');
      }
    },
  });

  if (isLoading || !appointments) {
    return <p className="py-8 text-sm font-body text-muted-foreground">Cargando citas…</p>;
  }

  if (appointments.length === 0) {
    return (
      <div className="py-8 space-y-4 text-center max-w-sm">
        <h1 className="t-display text-foreground">Mis citas</h1>
        <p className="text-sm font-body text-muted-foreground">No tienes citas agendadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="t-display text-foreground">Mis citas</h1>
      <ul className="space-y-3">
        {appointments.map((a: AppointmentDTO) => {
          const hoursUntil = (new Date(a.scheduledAt).getTime() - Date.now()) / 3_600_000;
          const canCancel = a.status === 'scheduled' && hoursUntil > 24;
          return (
            <li key={a.id} className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ boxShadow: '0 20px 40px rgba(48,51,46,0.05)' }}>
              <div className="flex-1">
                <p className="text-sm font-body font-medium text-foreground">{a.serviceName}</p>
                <p className="text-xs font-body text-muted-foreground">{formatLocal(a.scheduledAt)} · {a.specialistName}</p>
              </div>
              <div className="flex items-center gap-3">
                <AppointmentStatusPill status={a.status} />
                {canCancel && (
                  <button
                    onClick={() => cancel.mutate(a.id)}
                    disabled={cancel.isPending}
                    className="text-xs font-body text-muted-foreground hover:text-foreground underline transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
