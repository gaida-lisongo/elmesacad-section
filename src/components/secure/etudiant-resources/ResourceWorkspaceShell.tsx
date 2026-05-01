"use client";

import { Icon } from "@iconify/react";
import type { ReactNode } from "react";
import type { ResourceWorkspaceMode } from "./types";

type Props = {
  /** Titre principal (liste et formulaire). */
  title: string;
  titleIcon?: string;
  /** Sous-titre / meta — affiché uniquement en mode liste. */
  description?: ReactNode;
  mode: ResourceWorkspaceMode;
  /** Contenu mode liste (table, filtres…). */
  listSlot: ReactNode;
  /** Contenu mode création / édition (formulaire multi-étapes ou fiche). */
  formSlot: ReactNode;
};

/**
 * Enveloppe liste / formulaire pour les écrans « ressources service étudiant ».
 * Même idée que PageManager (basculer vers création) + PageDetail (focus fiche), sans imposer le contenu.
 */
export default function ResourceWorkspaceShell({
  title,
  titleIcon,
  description,
  mode,
  listSlot,
  formSlot,
}: Props) {
  const showForm = mode === "create" || mode === "edit";

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
          {titleIcon ? <Icon icon={titleIcon} className="h-8 w-8 shrink-0 text-primary" aria-hidden /> : null}
          {title}
        </h1>
        {!showForm && description ? (
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</div>
        ) : null}
      </header>
      {showForm ? formSlot : listSlot}
    </div>
  );
}
