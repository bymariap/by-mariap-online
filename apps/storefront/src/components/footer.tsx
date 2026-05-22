import Link from "next/link";
import { Instagram, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted mt-24">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Brand */}
        <div className="space-y-3">
          <p className="font-heading text-base font-semibold text-foreground">
            Cejas Medellín Studio
          </p>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            Expertos en la recuperación y diseño de cejas naturales. Un espacio
            para reconectar con tu belleza.
          </p>
          <div className="flex gap-3 pt-1">
            <a
              href="#"
              aria-label="Instagram"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-5 w-5" strokeWidth={1.5} />
            </a>
            <a
              href="#"
              aria-label="WhatsApp"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <p className="text-xs font-body font-medium uppercase tracking-wide text-muted-foreground">
            Enlaces
          </p>
          <nav className="space-y-2">
            <Link
              href="/politica-tratamiento-datos"
              className="block text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              Política de tratamiento de datos
            </Link>
          </nav>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <p className="text-xs font-body font-medium uppercase tracking-wide text-muted-foreground">
            Contacto
          </p>
          <address className="not-italic space-y-1">
            <p className="text-sm font-body text-muted-foreground">
              El Poblado, Medellín
            </p>
            <a
              href="mailto:hola@cejasmedellinstudio.co"
              className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              hola@cejasmedellinstudio.co
            </a>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t-0 bg-surface">
        <div className="container py-4">
          <p className="text-xs font-body text-muted-foreground">
            © 2025 Cejas Medellín Studio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
