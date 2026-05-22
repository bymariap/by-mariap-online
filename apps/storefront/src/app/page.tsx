import Link from "next/link";
import { Package, MapPin, ShieldCheck } from "lucide-react";
import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import type { ProductDTO } from "@bymariap/types";

export const revalidate = 60;

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
      <section className="bg-background py-32 text-center">
        <div className="container max-w-3xl mx-auto space-y-6">
          <p className="text-xs font-body font-medium uppercase tracking-widest text-muted-foreground">
            Digital Atelier • Medellín
          </p>
          <h1 className="font-heading text-5xl md:text-6xl font-semibold leading-tight text-foreground">
            Recupera la belleza natural de tus cejas
          </h1>
          <p className="font-body text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
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
      <section className="bg-muted py-16">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              icon: <Package className="h-6 w-6" strokeWidth={1.5} />,
              title: "Envíos en Medellín y Colombia",
              body: "Logística premium para que tus productos lleguen en perfecto estado.",
            },
            {
              icon: <MapPin className="h-6 w-6" strokeWidth={1.5} />,
              title: "Ubicación en El Poblado",
              body: "Un santuario de belleza diseñado para tu relajación y transformación.",
            },
            {
              icon: <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />,
              title: "Productos Certificados",
              body: "Fórmulas dermatológicamente testeadas para la salud de tu piel y vello.",
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-3">
              <span className="text-foreground">{item.icon}</span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="bg-background py-24">
        <div className="container space-y-10">
          <div className="space-y-2">
            <h2 className="font-heading text-3xl font-semibold text-foreground">
              Esenciales para tus cejas
            </h2>
            <p className="font-body text-sm text-muted-foreground">
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
            <p className="font-body text-sm text-muted-foreground">
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

      {/* ── SERVICES TEASER ── */}
      <section className="bg-muted py-24">
        <div className="container max-w-xl mx-auto text-center space-y-6">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Cuidado en Estudio
          </h2>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Diseño y recuperación experta. Agenda una sesión personalizada donde
            evaluamos la salud de tus folículos y diseñamos un plan de
            recuperación a medida.
          </p>
          <button
            disabled
            aria-disabled="true"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium opacity-50 cursor-not-allowed"
          >
            Agendar Cita (Próximamente)
          </button>
        </div>
      </section>
    </>
  );
}
