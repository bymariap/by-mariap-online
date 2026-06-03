import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Me } from "@/features/auth/use-me";

interface NavItem {
  to: string;
  label: string;
  visible: (user: Me) => boolean;
}

const isAdmin = (u: Me) => u.role.name === "admin";
const hasSpecialistProfile = (u: Me) => Boolean(u.specialist);
const isSpecialistRole = (u: Me) => u.role.name === "specialist";

const nav: NavItem[] = [
  { to: "/products", label: "Productos", visible: isAdmin },
  { to: "/categories", label: "Categorías", visible: isAdmin },
  { to: "/users", label: "Usuarios", visible: isAdmin },
  { to: "/specialists", label: "Especialistas", visible: isAdmin },
  { to: "/services", label: "Servicios", visible: isAdmin },
  // "Mi agenda": specialists manage their own; admins manage any specialist's
  // agenda via the in-page selector, even without a profile of their own.
  { to: "/mi-agenda", label: "Mi agenda", visible: (u) => isAdmin(u) || hasSpecialistProfile(u) },
  // Admin sees all appointments; a specialist sees their own.
  {
    to: "/citas",
    label: "Citas",
    visible: (u) => isAdmin(u) || isSpecialistRole(u),
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNav = user ? nav.filter((n) => n.visible(user)) : [];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      <aside className="bg-muted border-r border-border p-4 flex flex-col gap-4">
        <div className="font-semibold">By MariaP - Admin</div>
        <nav className="flex flex-col gap-1">
          {visibleNav.map((n) => (
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
        <div className="mt-auto pt-4 border-t border-border space-y-2">
          <div
            className="text-xs text-muted-foreground truncate"
            title={user?.email}
          >
            {user?.email}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full"
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
