'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useMe } from '@/lib/auth/hooks';
import { bookingApi } from '@/lib/booking/api';
import { DateSlotPicker } from '@/components/date-slot-picker';
import type { ServiceDTO } from '@bymariap/types';

interface FormValues {
  specialistId: string;
  guestFullName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
}

export function BookingForm({ service }: { service: ServiceDTO }) {
  const me = useMe();
  const router = useRouter();
  const [startAt, setStartAt] = useState<string>('');
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { specialistId: '', guestFullName: '', guestEmail: '', guestPhone: '', notes: '' },
  });
  const specialistId = watch('specialistId');

  const { data: specialists } = useQuery({
    queryKey: ['public-specialists'],
    queryFn: bookingApi.specialists,
  });

  async function onSubmit(v: FormValues) {
    if (!startAt) return toast.error('Selecciona un horario');
    if (!v.specialistId) return toast.error('Selecciona una especialista');
    try {
      await bookingApi.book({
        serviceId: service.id,
        specialistId: v.specialistId,
        startAt,
        guestEmail: me.data ? undefined : v.guestEmail,
        guestPhone: me.data ? undefined : v.guestPhone,
        guestFullName: me.data ? undefined : v.guestFullName,
        notes: v.notes || undefined,
      });
      toast.success('¡Cita agendada!');
      router.push('/mi-cuenta/citas');
    } catch (e: unknown) {
      const err = e as { body?: { code?: string }; message?: string };
      if (err?.body?.code === 'SLOT_TAKEN') {
        toast.error('Ese horario ya fue tomado, elige otro.');
      } else {
        toast.error(err?.message ?? 'No se pudo agendar la cita.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-md p-6" style={{ boxShadow: '0 20px 40px rgba(48,51,46,0.05)' }}>
      <h2 className="font-heading text-xl font-semibold text-foreground">Agenda tu cita</h2>

      {/* Specialist selector */}
      <div className="space-y-2">
        <label className="text-sm font-body font-medium text-foreground">Especialista</label>
        {specialists && specialists.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {specialists.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input type="radio" {...register('specialistId')} value={s.id} className="sr-only" />
                <div className={`p-3 rounded-md border text-sm font-body transition-colors ${specialistId === s.id ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-foreground'}`}>
                  <p className="font-medium text-foreground">{s.user.fullName}</p>
                  {s.specialties?.[0] && <p className="text-xs text-muted-foreground mt-0.5">{s.specialties[0]}</p>}
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm font-body text-muted-foreground">Cargando especialistas…</p>
        )}
      </div>

      {/* Date + slot picker */}
      {specialistId && (
        <DateSlotPicker
          serviceId={service.id}
          specialistId={specialistId}
          value={startAt}
          onChange={setStartAt}
        />
      )}

      {/* Guest fields — only when not logged in */}
      {!me.data && (
        <div className="space-y-3">
          <p className="text-xs font-body text-muted-foreground">Ingresa tus datos para confirmar la cita</p>
          <div>
            <label className="block text-sm font-body font-medium text-foreground mb-1">Nombre completo</label>
            <input {...register('guestFullName')} required minLength={2}
              className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-body font-medium text-foreground mb-1">Teléfono</label>
            <input {...register('guestPhone')} type="tel" required placeholder="+57 300 000 0000"
              className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-body font-medium text-foreground mb-1">Email</label>
            <input {...register('guestEmail')} type="email" required
              className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-body font-medium text-foreground mb-1">Notas (opcional)</label>
        <textarea {...register('notes')} rows={3}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </div>

      <button type="submit" disabled={isSubmitting || !startAt}
        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
        {isSubmitting ? 'Agendando…' : 'Confirmar cita'}
      </button>
      <p className="text-xs font-body text-muted-foreground text-center">El pago se realiza en sitio.</p>
    </form>
  );
}
