"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function GuestFloatingAccess() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="max-w-[min(12rem,70vw)] rounded-full border border-primary/30 bg-primary px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-darkprimary"
      >
        Mon Espace
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <div
            ref={panelRef}
            className="w-full max-w-md rounded-2xl border border-primary/20 bg-white p-5 shadow-2xl dark:border-primary/30 dark:bg-darklight"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bienvenue sur votre espace</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Connectez-vous pour acceder a votre tableau de bord ou creez un compte si vous etes nouveau.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-darkprimary"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary/40 dark:text-primary dark:hover:bg-primary/20"
              >
                Creer un compte
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
