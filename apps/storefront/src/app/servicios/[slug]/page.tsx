import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ServiceDTO } from '@bymariap/types';
import { formatCop } from '@/lib/format';
import { BookingForm } from './booking-form';

export const revalidate = 60;

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function getService(slug: string): Promise<ServiceDTO | null> {
  const res = await fetch(`${BASE}/store/services/${slug}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch service');
  return res.json();
}

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  return s ? { title: `${s.name} · By MariaP`, description: s.description ?? undefined } : { title: 'Servicio no encontrado' };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  return (
    <div className="container py-12">
      <div className="grid md:grid-cols-2 gap-12">
        <section className="space-y-4">
          <h1 className="font-heading text-4xl font-semibold text-foreground">{service.name}</h1>
          <p className="font-heading text-2xl text-foreground">{formatCop(service.priceCop)}</p>
          <p className="text-sm font-body text-muted-foreground">{service.durationMinutes} minutos</p>
          {service.description && (
            <p className="text-sm font-body text-muted-foreground whitespace-pre-line">{service.description}</p>
          )}
        </section>
        <section>
          <BookingForm service={service} />
        </section>
      </div>
    </div>
  );
}
