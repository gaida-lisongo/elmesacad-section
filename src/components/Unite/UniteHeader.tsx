"use client";

import type { PublicUniteDetail } from "@/actions/publicUnites";

export default function UniteHeader({ unite }: { unite: PublicUniteDetail }) {
  return (
    <div className="space-y-4">
      {/* Code de l'UE */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary bg-primary/10 px-3 py-1 rounded-full">
          {unite.code}
        </span>
      </div>

      {/* Désignation */}
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        {unite.designation}
      </h1>

      {/* Description */}
      <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {unite.description}
        </p>
      </div>

      {/* Métadonnées: Filière et Préalables */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Filière
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            {unite.filiere}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Préalables
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {unite.préalables.map((prealable, index) => (
              <span
                key={index}
                className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg"
              >
                {prealable}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
