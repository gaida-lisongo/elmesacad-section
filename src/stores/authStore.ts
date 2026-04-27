import { create } from "zustand";
import type { AuthUser } from "@/lib/auth/types";

type AuthState = {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (u: AuthUser | null) => void;
  setHydrated: (v: boolean) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  setUser: (u) => set({ user: u }),
  setHydrated: (v) => set({ isHydrated: v }),
  hydrate: async () => {
    try {
      const r = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (r.ok) {
        const j = (await r.json()) as { user: AuthUser | null };
        set({ user: j.user ?? null, isHydrated: true });
        return;
      }
      set({ user: null, isHydrated: true });
    } catch {
      set({ user: null, isHydrated: true });
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      set({ user: null });
    }
  },
}));
