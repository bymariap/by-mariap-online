"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

export function MobileNav({ navLinks }: { navLinks: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="p-1 text-foreground hover:text-muted-foreground transition-colors"
      >
        <Menu className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className="absolute top-0 right-0 h-full w-72 max-w-[80%] bg-background shadow-xl p-6 flex flex-col">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="self-end p-1 mb-6 text-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 font-body text-base text-foreground hover:text-muted-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
