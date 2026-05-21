import { createContext, ReactNode, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe, Me } from "./use-me";

interface AuthCtx {
  user: Me | undefined;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useMe();

  async function login(email: string, password: string) {
    await api.post("/auth/login", { email, password });
    await qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function logout() {
    await api.post("/auth/logout");
    qc.clear();
  }

  return (
    <Ctx.Provider
      value={{ user: me.data, loading: me.isLoading, login, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
