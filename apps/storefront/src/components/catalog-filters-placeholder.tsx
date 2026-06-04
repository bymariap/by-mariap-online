const objetivos = ["Crecimiento", "Definición", "Hidratación"];

export function CatalogFiltersPlaceholder() {
  return (
    <div className="mt-8 space-y-8">
      {/* TODO(backend): filtro por objetivo (no existe el atributo en el modelo) */}
      <div className="space-y-3">
        <p className="font-heading text-lg text-foreground">Objetivo</p>
        <div className="space-y-2 opacity-60">
          {objetivos.map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 text-sm font-body text-muted-foreground cursor-not-allowed"
            >
              <input type="checkbox" disabled className="accent-primary" />
              {o}
            </label>
          ))}
        </div>
      </div>

      {/* TODO(backend): filtro por precio (el filtrado debe hacerse en backend) */}
      <div className="space-y-3">
        <p className="font-heading text-lg text-foreground">Precio</p>
        <div className="space-y-2 opacity-60">
          <input
            type="range"
            disabled
            className="w-full accent-primary cursor-not-allowed"
          />
          <div className="flex justify-between text-xs font-body text-muted-foreground">
            <span>$0</span>
            <span>$500.000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
