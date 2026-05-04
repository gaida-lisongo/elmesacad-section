"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import ClientIcon from "@/components/Common/ClientIcon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-white px-4 dark:bg-darkmode">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-secondary/10 text-secondary">
          <ClientIcon icon="solar:bomb-emoji-bold-duotone" className="h-14 w-14" />
        </div>
        
        <h1 className="mb-4 text-3xl font-black text-midnight_text dark:text-white sm:text-4xl">
          Une erreur est survenue
        </h1>
        
        <p className="mb-10 text-lg text-slate-600 dark:text-slate-400">
          Nous sommes désolés, mais quelque chose s&apos;est mal passé lors du chargement de la page.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs text-slate-400">
              ID Erreur : {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white transition hover:bg-darkprimary hover:shadow-lg"
          >
            <ClientIcon icon="solar:restart-bold-duotone" className="h-5 w-5" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-midnight_text transition hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-white"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
