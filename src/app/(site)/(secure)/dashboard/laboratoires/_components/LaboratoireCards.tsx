"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { slugifyDesignation } from "@/lib/utils/formationSlug";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import type { AgentListItem } from "@/lib/services/UserManager";

export type LaboratoireItem = {
  id: string;
  nom: string;
  slug: string;
  techniciensCount: number;
  departementsCount: number;
};

export function LaboratoireCardItem({
  item,
  onDelete,
}: {
  item: LaboratoireItem;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon icon="solar:flask-bold-duotone" className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-midnight_text dark:text-white">{item.nom}</h3>
          <p className="truncate text-xs text-gray-500">/{item.slug}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-xs font-bold text-midnight_text dark:text-white">{item.techniciensCount}</p>
            <p className="text-[10px] uppercase text-gray-400">Techs</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-midnight_text dark:text-white">{item.departementsCount}</p>
            <p className="text-[10px] uppercase text-gray-400">Depts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Public */}
          <Link
            href={`/laboratoires/${item.slug}`}
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500 transition hover:bg-primary/10 hover:text-primary dark:bg-gray-800"
            title="Voir la page publique"
          >
            <Icon icon="solar:eye-bold-duotone" className="h-5 w-5" />
          </Link>

          {/* Modifier (Dashboard Detail) */}
          <Link
            href={`/dashboard/laboratoires/${item.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500 transition hover:bg-primary/10 hover:text-primary dark:bg-gray-800"
            title="Modifier"
          >
            <Icon icon="solar:pen-new-square-bold-duotone" className="h-5 w-5" />
          </Link>

          {/* Supprimer */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-900/20"
              title="Supprimer"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type SelectedTech = {
  agent: AgentListItem;
  fonction: "admin" | "moderateur";
};

export function LaboratoireCardCreate() {
  const [step, setStep] = useState(1);
  const [nom, setNom] = useState("");
  const [techs, setTechs] = useState<SelectedTech[]>([]);

  const slug = useMemo(() => slugifyDesignation(nom), [nom]);

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  const addTech = (agent: AgentListItem) => {
    if (techs.find((t) => t.agent.id === agent.id)) return;
    setTechs([...techs, { agent, fonction: "moderateur" }]);
  };

  const removeTech = (id: string) => {
    setTechs(techs.filter((t) => t.agent.id !== id));
  };

  const updateTechFonction = (id: string, fonction: "admin" | "moderateur") => {
    setTechs(techs.map((t) => (t.agent.id === id ? { ...t, fonction } : t)));
  };

  return (
    <div className="space-y-6">
      {/* Stepper Indicator */}
      <div className="flex items-center gap-2">
        <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`} />
        <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`} />
      </div>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h4 className="mb-4 font-bold text-midnight_text dark:text-white">Étape 1 : Description du Laboratoire</h4>
          <div className="grid gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Nom du Laboratoire</label>
              <input
                name="nom"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={inputClass}
                placeholder="Ex: Laboratoire de Géotechnique"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Slug (Automatique)</label>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">
                {slug || "en attente du nom..."}
              </div>
              <input type="hidden" name="slug" value={slug} />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!nom.trim()}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
            >
              Suivant
              <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-300">
          <h4 className="mb-4 font-bold text-midnight_text dark:text-white">Étape 2 : Assignation des Techniciens</h4>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Rechercher un agent</label>
            <UserDatabaseSearch kind="agent" onSelect={addTech} clearOnSelect />
          </div>

          <div className="space-y-3">
            {techs.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400 italic">Aucun technicien assigné pour le moment.</p>
            )}
            {techs.map((t) => (
              <div
                key={t.agent.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-gray-100 dark:ring-gray-700">
                    <img src={t.agent.photo || "/images/user.jpg"} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-midnight_text dark:text-white">{t.agent.name}</p>
                    <p className="text-[10px] text-gray-500">{t.agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={t.fonction}
                    onChange={(e) => updateTechFonction(t.agent.id, e.target.value as "admin" | "moderateur")}
                    className="rounded-lg border-none bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-600 outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:text-gray-300"
                  >
                    <option value="moderateur">Modérateur</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeTech(t.agent.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Techniciens hidden input for form submission */}
          <input
            type="hidden"
            name="techniciens"
            value={JSON.stringify(techs.map((t) => ({ agent: t.agent.id, fonction: t.fonction })))}
          />

          <div className="mt-8 flex justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Icon icon="solar:alt-arrow-left-linear" className="h-4 w-4" />
              Retour
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90"
            >
              Créer le laboratoire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
