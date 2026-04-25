"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

/** Hydrate le store Zustand au chargement (cookie session). */
export function AuthHydrate() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return null;
}
