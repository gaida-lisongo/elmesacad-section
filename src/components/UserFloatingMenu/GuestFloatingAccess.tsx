"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";

export default function GuestFloatingAccess() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="relative flex flex-col items-end">
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center">
          <div
            ref={panelRef}
            className="w-full max-w-md rounded-2xl border border-primary/20 bg-white p-6 shadow-2xl dark:border-primary/30 dark:bg-darklight"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon icon="solar:user-plus-bold-duotone" className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bienvenue sur votre espace</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Connectez-vous pour accéder à votre tableau de bord ou créez un compte si vous êtes nouveau.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-darkprimary hover:shadow-xl"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-primary/30 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary/40 dark:text-primary dark:hover:bg-primary/20"
              >
                Créer un compte
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Dock Bar */}
      <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 p-1.5 shadow-lg backdrop-blur-lg dark:border-white/10 dark:bg-gray-900/80">
        {/* Theme Toggler */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Icon icon="solar:sun-bold-duotone" className="h-6 w-6" />
          ) : (
            <Icon icon="solar:moon-bold-duotone" className="h-6 w-6" />
          )}
        </button>

        <div className="h-6 w-px bg-primary/20 dark:bg-white/10" />

        {/* User Menu Trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-full px-4 text-gray-700 transition hover:bg-primary/10 hover:text-primary dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Icon icon="solar:user-circle-bold-duotone" className="h-5 w-5" />
          <span className="max-w-[8rem] truncate text-xs font-bold uppercase tracking-wide">
            Mon Espace
          </span>
        </button>
      </div>
    </div>
  );
}
