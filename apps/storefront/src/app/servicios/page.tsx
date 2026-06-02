import type { Metadata } from 'next';
import type { ServiceDTO } from '@bymariap/types';
import { ServiceCard } from '@/components/service-card';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Servicios · By MariaP' };

async function getServices(): Promise<ServiceDTO[]> {
  const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const res = await fetch(`${BASE}/store/services`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export default async function ServiciosPage() {
  const services = await getServices();
  return (
    <div className="container py-12 space-y-8">
      <header>
        <h1 className="font-heading text-4xl font-semibold text-foreground">Servicios</h1>
        <p className="mt-2 text-sm font-body text-muted-foreground">Agenda tu cita con nuestras especialistas.</p>
      </header>
      {services.length === 0 ? (
        <p className="text-sm font-body text-muted-foreground">No hay servicios disponibles.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}
    </div>
  );
}
