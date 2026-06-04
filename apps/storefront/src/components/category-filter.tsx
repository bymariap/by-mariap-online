"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import type { CategoryDTO } from "@bymariap/types";
import { cn } from "@/lib/cn";

export function CategoryFilter({ categories }: { categories: CategoryDTO[] }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const active = sp.get("categoria");

  function hrefFor(slug: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (slug) next.set("categoria", slug);
    else next.delete("categoria");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav className="space-y-1">
      <p className="font-heading text-lg text-foreground mb-3">Categorías</p>
      <Link
        href={hrefFor(null)}
        className={cn(
          "block w-full text-left px-3 py-2 rounded-md text-sm font-body transition-colors",
          !active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        Todos los productos
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={hrefFor(c.slug)}
          className={cn(
            "block w-full text-left px-3 py-2 rounded-md text-sm font-body transition-colors",
            active === c.slug
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
