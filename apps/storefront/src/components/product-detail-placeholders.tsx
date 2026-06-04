function Bar({ className }: { className?: string }) {
  return <div className={`bg-muted rounded ${className ?? ""}`} />;
}

export function ProductUsageSections() {
  return (
    <div className="space-y-20 md:space-y-24">
      {/* TODO(backend): pasos de uso del producto */}
      <section>
        <h2 className="t-sub-italic border-l-4 border-accent-container pl-6 mb-8">
          ¿Cómo usar?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Bar className="h-4 w-24" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* TODO(backend): ingredientes clave */}
      <section>
        <h2 className="t-section text-foreground mb-8">Ingredientes Clave</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <Bar className="h-4 w-32" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      {/* TODO(backend): reseñas / experiencias reales */}
      <section>
        <h2 className="t-section italic text-foreground mb-8">
          Experiencias Reales
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border p-6"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <Bar className="h-3 w-24" />
              </div>
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProductFaqSection() {
  return (
    <section>
      {/* TODO(backend): preguntas frecuentes */}
      <h2 className="t-section text-foreground mb-6">Preguntas Frecuentes</h2>
      <div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border py-4">
            <div className="bg-muted rounded h-4 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
