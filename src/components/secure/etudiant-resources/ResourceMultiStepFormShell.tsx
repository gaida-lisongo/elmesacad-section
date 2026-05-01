"use client";

import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

export type ResourceStepMeta = {
  num: number;
  label: string;
  icon: string;
};

type Props = {
  headerTitle: string;
  headerIconCreate?: string;
  headerIconEdit?: string;
  mode: "create" | "edit";
  steps: ResourceStepMeta[];
  activeStep: number;
  error: string | null;
  onCancel: () => void;
  cancelLabel?: string;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Chrome partagé pour les formulaires ressource multi-étapes (étapes, erreur, pied de page).
 * Le contenu métier (champs par étape) reste dans un composant par contexte (sujet, stage, etc.).
 */
export default function ResourceMultiStepFormShell({
  headerTitle,
  headerIconCreate = "solar:add-folder-bold-duotone",
  headerIconEdit = "solar:pen-new-square-bold-duotone",
  mode,
  steps,
  activeStep,
  error,
  onCancel,
  cancelLabel = "Retour à la liste",
  children,
  footer,
}: Props) {
  const headerIcon = mode === "create" ? headerIconCreate : headerIconEdit;

  return (
    <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-midnight_text dark:text-white">
            <Icon icon={headerIcon} className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            {headerTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-600"
          >
            <Icon icon="solar:arrow-left-linear" className="h-4 w-4" aria-hidden />
            {cancelLabel}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {steps.map((s) => {
            const active = activeStep === s.num;
            return (
              <div
                key={s.num}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Icon icon={s.icon} className="h-3.5 w-3.5" aria-hidden />
                <span>
                  {s.num}. {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {error ? (
          <div className="mb-3 flex gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            <Icon icon="solar:danger-circle-bold-duotone" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        ) : null}

        {children}

        <div className="mt-8 flex justify-between gap-2 border-t border-gray-100 pt-6 dark:border-gray-800">
          {footer}
        </div>
      </div>
    </section>
  );
}
