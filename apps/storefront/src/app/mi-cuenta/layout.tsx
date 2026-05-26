"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useMe, useLogout } from "@/lib/auth/hooks";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Mi perfil", href: "/mi-cuenta" },
  { label: "Mis pedidos", href: "/mi-cuenta/pedidos" },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();

  useEffect(() => {
    if (!me.isLoading && !me.data) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [me.isLoading, me.data, router, pathname]);

  if (me.isLoading || !me.data) {
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const initials = me.data.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row gap-10 items-start">
        {/* Sidebar */}
        <aside className="w-full md:w-48 shrink-0">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <span className="font-heading text-lg text-foreground">
                {initials}
              </span>
            </div>
            <p className="font-body text-sm font-medium text-foreground">
              {me.data.fullName}
            </p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-body transition-colors",
                  pathname === item.href
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => router.replace("/"),
                })
              }
              className="block w-full text-left px-3 py-2 rounded-md text-sm font-body text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            >
              Cerrar sesión
            </button>
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
