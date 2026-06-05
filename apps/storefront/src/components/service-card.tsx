import Link from "next/link";
import Schedule from "@material-symbols/svg-300/outlined/schedule.svg?react";
import type { ServiceDTO } from "@bymariap/types";
import { formatCop } from "@/lib/format";

export function ServiceCard({ service }: { service: ServiceDTO }) {
  return (
    <div
      className="bg-white rounded-xl p-6 flex flex-col gap-4"
      style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
    >
      <div>
        <h3 className="font-heading text-xl text-foreground">{service.name}</h3>
        {service.description && (
          <p className="mt-1 text-sm font-body text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm font-body text-muted-foreground">
        <span className="flex items-center gap-1">
          <Schedule className="h-3.5 w-3.5" />
          {service.durationMinutes} min
        </span>
        <span className="font-medium text-foreground">
          {formatCop(service.priceCop)}
        </span>
      </div>
      <Link
        href={`/servicios/${service.slug}`}
        className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Seleccionar
      </Link>
    </div>
  );
}
