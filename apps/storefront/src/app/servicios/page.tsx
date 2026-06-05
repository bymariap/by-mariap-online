import type { Metadata } from "next";
import type { ServiceDTO } from "@bymariap/types";
import { ServiceCard } from "@/components/service-card";
import {
  SpecialistCard,
  type SpecialistSummary,
} from "@/components/specialist-card";

export const revalidate = 60;
export const metadata: Metadata = { title: "Servicios · By MariaP" };

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function getServices(): Promise<ServiceDTO[]> {
  try {
    const res = await fetch(`${BASE}/store/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getSpecialists(): Promise<SpecialistSummary[]> {
  try {
    const res = await fetch(`${BASE}/store/specialists`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ServiciosPage() {
  const [services, specialists] = await Promise.all([
    getServices(),
    getSpecialists(),
  ]);

  return (
    <div className="container py-12 space-y-20">
      {/* Hero */}
      <header className="max-w-2xl space-y-4">
        <p className="t-eyebrow">Cuidado en Estudio</p>
        <h1 className="t-hero text-foreground">Agenda tu cita</h1>
        <p className="font-body text-base md:text-lg font-light text-muted-foreground">
          Diseño y recuperación experta con nuestras especialistas en El Poblado.
        </p>
      </header>

      {/* Services */}
      <section className="space-y-8">
        <h2 className="t-display text-foreground">Servicios</h2>
        {services.length === 0 ? (
          <p className="text-sm font-body text-muted-foreground">
            No hay servicios disponibles.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {/* Specialists */}
      {specialists.length > 0 && (
        <section className="space-y-8">
          <h2 className="t-display text-foreground">Tu Especialista</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialists.map((sp) => (
              <SpecialistCard key={sp.id} specialist={sp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
