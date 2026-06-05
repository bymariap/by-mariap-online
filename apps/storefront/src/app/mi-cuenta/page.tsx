'use client';

import { useMe } from '@/lib/auth/hooks';

export default function ProfilePage() {
  const me = useMe();

  // Auth guard is handled by layout; just show loading if data not yet ready
  if (me.isLoading || !me.data) return null;

  return (
    <div className="space-y-10 max-w-lg">
      <h1 className="t-display text-foreground">Mi Perfil</h1>

      {/* Información Personal (datos reales) */}
      <section className="space-y-4">
        <div>
          <h2 className="t-sub-italic text-foreground">Información Personal</h2>
          <p className="text-sm font-body font-light text-muted-foreground mt-1">
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
      </section>

      {/* Dirección de Envío (placeholder) */}
      <section className="space-y-4">
        <h2 className="t-sub-italic text-foreground">Dirección de Envío</h2>
        {/* TODO(backend): dirección guardada del usuario */}
        <div className="space-y-2">
          <div className="bg-muted rounded h-4 w-3/4" />
          <div className="bg-muted rounded h-4 w-1/2" />
          <div className="bg-muted rounded h-4 w-2/3" />
        </div>
      </section>

      {/* Seguridad (placeholder) */}
      <section className="space-y-4">
        <h2 className="t-sub-italic text-foreground">Seguridad</h2>
        {/* TODO(backend): cambio de contraseña */}
        <InfoRow label="Contraseña" value="••••••••" />
        <button
          disabled
          className="h-11 px-6 rounded-full border border-border font-body text-sm text-foreground opacity-50 cursor-not-allowed"
        >
          Cambiar contraseña
        </button>
      </section>
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
