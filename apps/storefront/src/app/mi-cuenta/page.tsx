'use client';

import { useMe } from '@/lib/auth/hooks';

export default function ProfilePage() {
  const me = useMe();

  // Auth guard is handled by layout; just show loading if data not yet ready
  if (me.isLoading || !me.data) return null;

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Información Personal
        </h1>
        <p className="text-sm font-body text-muted-foreground mt-1">
          Gestiona tu información personal y preferencias para una experiencia
          más personalizada en nuestro atelier.
        </p>
      </div>

      <div className="space-y-4">
        <InfoRow label="Nombre" value={me.data.fullName} />
        <InfoRow label="Correo electrónico" value={me.data.email} />
        {me.data.phone && <InfoRow label="Teléfono" value={me.data.phone} />}
      </div>

      <button
        disabled
        className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm opacity-50 cursor-not-allowed"
      >
        Guardar cambios
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-body text-foreground">{value}</p>
    </div>
  );
}
