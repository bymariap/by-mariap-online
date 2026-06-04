"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { CategoryDTO } from "@bymariap/types";

export function EmptyCartSuggestions() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<CategoryDTO[]>(endpoints.storeCategories),
  });

  if (!categories || categories.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
      {categories.slice(0, 3).map((c) => (
        <Link
          key={c.id}
          href={`/productos?categoria=${c.slug}`}
          className="group block text-center"
        >
          {/* TODO(asset): imagen de categoría */}
          <div className="aspect-[4/5] bg-muted rounded-xl" />
          <p className="font-heading italic text-lg text-foreground mt-3">
            {c.name}
          </p>
        </Link>
      ))}
    </div>
  );
}
