import Link from "next/link";
import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import type { ProductDTO } from "@bymariap/types";
import LocalShipping from "@material-symbols/svg-300/outlined/local_shipping.svg?react";
import LocationOn from "@material-symbols/svg-300/outlined/location_on.svg?react";
import VerifiedUser from "@material-symbols/svg-300/outlined/verified_user.svg?react";
import CalendarToday from "@material-symbols/svg-300/outlined/calendar_today.svg?react";

export const revalidate = 60;

const trustItems = [
  {
    Icon: LocalShipping,
    circle: "bg-accent-container text-accent-container-foreground",
    title: "Envíos en Medellín y Colombia",
    body: "Logística premium para que tus productos lleguen en perfecto estado.",
  },
  {
    Icon: LocationOn,
    circle: "bg-muted text-foreground",
    title: "Ubicación en El Poblado",
    body: "Un santuario de belleza diseñado para tu relajación y transformación.",
  },
  {
    Icon: VerifiedUser,
    circle: "bg-surface-high text-foreground",
    title: "Productos Certificados",
    body: "Fórmulas dermatológicamente testeadas para la salud de tu piel y vello.",
  },
];

export default async function HomePage() {
  let products: ProductDTO[] = [];
  try {
    products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, {
      next: { revalidate: 60 },
    });
  } catch {
    // API not running during build — render with empty list
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* TODO(asset): imagen de fondo del hero — reemplazar este div por <Image fill> */}
        <div className="absolute inset-0 bg-muted" aria-hidden />
        <div className="relative z-10 max-w-xl px-8 md:px-16 space-y-6">
          <p className="t-eyebrow">Digital Atelier • Medellín</p>
          <h1 className="t-hero text-foreground">
            Recupera la belleza natural de tus cejas
          </h1>
          <p className="font-body text-base md:text-lg font-light text-muted-foreground max-w-md leading-relaxed">
            Productos premium y servicios expertos en el corazón de Medellín.
            Redescubre tu mirada con un enfoque minimalista y orgánico.
          </p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Ver Productos <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ── TRUST INDICATORS ── */}
      <section className="bg-surface py-20">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-16">
          {trustItems.map(({ Icon, circle, title, body }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center gap-4"
            >
              <span
                className={`w-16 h-16 rounded-full flex items-center justify-center ${circle}`}
              >
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="font-heading text-xl text-foreground">{title}</h3>
              <p className="font-body text-sm font-light text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRANSFORMACIONES (placeholder) ── */}
      <section id="galeria" className="bg-muted py-24">
        <div className="container space-y-10">
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="t-eyebrow">Transformaciones</p>
              <h2 className="t-display text-foreground">
                Nuestras transformaciones
              </h2>
            </div>
            <Link
              href="/#galeria"
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Ver Galería Completa →
            </Link>
          </div>
          {/* TODO(backend): galería real de transformaciones (antes/después) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] bg-surface-high rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="bg-background py-24">
        <div className="container space-y-10">
          <div className="space-y-2">
            <h2 className="t-display text-foreground">
              Esenciales para tus cejas
            </h2>
            <p className="font-body text-sm md:text-base font-light text-muted-foreground">
              Nuestra curaduría de productos diseñados para fortalecer y
              embellecer desde casa.
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="font-body text-sm font-light text-muted-foreground">
              Los productos se cargarán cuando la tienda esté activa.
            </p>
          )}

          <div>
            <Link
              href="/productos"
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos los productos →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVICES BANNER ── */}
      <section className="py-24 px-8">
        <div className="container relative rounded-xl overflow-hidden min-h-[500px] flex items-center p-12 md:p-24 bg-surface-high">
          {/* TODO(asset): imagen del estudio — reemplazar este div por <Image fill> */}
          <div className="absolute inset-0 bg-muted opacity-60" aria-hidden />
          <div className="relative z-10 max-w-xl space-y-6">
            <span className="t-eyebrow">Cuidado en Estudio</span>
            <h2 className="t-display text-foreground">
              Diseño y recuperación experta
            </h2>
            <p className="font-body text-lg font-light text-muted-foreground">
              Agenda una sesión personalizada donde evaluamos la salud de tus
              folículos y diseñamos un plan de recuperación a medida.
            </p>
            <Link
              href="/servicios"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-accent text-accent-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Agendar Cita <CalendarToday className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
