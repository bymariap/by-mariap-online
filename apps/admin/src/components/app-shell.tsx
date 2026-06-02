import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/products", label: "Productos" },
  { to: "/categories", label: "Categorías" },
  { to: "/users", label: "Usuarios" },
  { to: "/specialists", label: "Especialistas" },
  { to: "/services", label: "Servicios" },
  { to: "/mi-agenda", label: "Mi agenda" },
  { to: "/citas", label: "Citas" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      <aside className="bg-muted border-r border-border p-4 space-y-4">
        <div className="font-semibold">by mariap</div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 rounded-md text-sm",
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 text-xs space-y-2">
          <div>{user?.email}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full"
          >
            Salir
          </Button>
        </div>
      </aside>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
