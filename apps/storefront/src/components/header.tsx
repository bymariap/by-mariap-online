import Link from "next/link";
import Person from "@material-symbols/svg-300/outlined/person.svg?react";
import { CartIconButton } from "./cart-icon-button";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Tienda", href: "/productos" },
  { label: "Servicios", href: "/servicios" },
  { label: "Galería", href: "/#galeria" },
  { label: "Nosotros", href: "/#nosotros" },
  { label: "Contacto", href: "/#contacto" },
];

export function Header() {
  return (
    <header
      className="fixed top-0 inset-x-0 z-50 border-b-0"
      style={{
        background: "rgba(251,249,245,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight text-foreground"
        >
          By MariaP
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/mi-cuenta"
            aria-label="Mi cuenta"
            className="p-1 text-foreground hover:text-muted-foreground transition-colors"
          >
            <Person className="h-5 w-5" />
          </Link>
          <CartIconButton />
        </div>
      </div>
    </header>
  );
}
