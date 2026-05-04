"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";

export type LaboratoireItem = {
  id: string;
  nom: string;
  slug: string;
  techniciensCount: number;
  departementsCount: number;
};

export function LaboratoireCardItem({ item }: { item: LaboratoireItem }) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon icon="solar:flask-bold-duotone" className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-midnight_text dark:text-white">{item.nom}</h3>
          <p className="text-xs text-gray-500">/{item.slug}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs font-bold text-midnight_text dark:text-white">{item.techniciensCount}</p>
          <p className="text-[10px] uppercase text-gray-400">Techs</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-midnight_text dark:text-white">{item.departementsCount}</p>
          <p className="text-[10px] uppercase text-gray-400">Depts</p>
        </div>
        <Link
          href={`/dashboard/laboratoires/${item.id}`}
          className="rounded-full bg-gray-100 p-2 text-gray-400 transition hover:bg-primary/10 hover:text-primary dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon icon="solar:alt-arrow-right-linear" className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

export function LaboratoireCardCreate() {
  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Nom du Laboratoire</label>
        <input name="nom" required className={inputClass} placeholder="Ex: Laboratoire de Géotechnique" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Slug (URL)</label>
        <input name="slug" required className={inputClass} placeholder="ex: labo-geotechnique" />
      </div>
      <div className="md:col-span-2">
        <button type="submit" className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90">
          Créer le laboratoire
        </button>
      </div>
    </div>
  );
}
