"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import type { ResourceFraisItem, ResourceType } from "./types";

type Props = {
  item: ResourceFraisItem;
  resourceType: ResourceType;
  onToggleStatus?: (item: ResourceFraisItem) => void;
  onDelete?: (item: ResourceFraisItem) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
};

function isPublicationActive(status: string): boolean {
  const st = (status || "").toLowerCase();
  return st === "active" || st === "published" || st === "disponible";
}

function getResourceLabel(type: ResourceType): string {
  switch (type) {
    case "session":
      return "Session";
    case "validation":
      return "Validation";
    case "releve":
      return "Relevé";
    case "labo":
      return "Laboratoire";
    default:
      return "Ressource";
  }
}

function getResourceIcon(type: ResourceType): string {
  switch (type) {
    case "session":
      return "solar:calendar-date-bold-duotone";
    case "validation":
      return "solar:checklist-bold-duotone";
    case "releve":
      return "solar:document-text-bold-duotone";
    case "labo":
      return "solar:flask-bold-duotone";
    default:
      return "solar:document-bold-duotone";
  }
}

export default function ResourceFraisCard({
  item,
  resourceType,
  onToggleStatus,
  onDelete,
  isToggling,
  isDeleting,
}: Props) {
  const active = isPublicationActive(item.status);
  const switching = isToggling;
  const removing = isDeleting;

  // Déterminer le contenu spécifique selon le type
  const renderSpecificInfo = () => {
    switch (resourceType) {
      case "session":
        return (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium dark:bg-gray-800 dark:text-gray-200">
              <Icon icon="solar:notebook-bold-duotone" className="h-3.5 w-3.5" />
              {item.matieresCount || 0} programme{(item.matieresCount || 0) > 1 ? "s" : ""}
            </span>
            {item.matieresSummary ? (
              <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {item.matieresSummary}
              </p>
            ) : null}
          </>
        );
      case "validation":
      case "releve":
        return (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.anneeSlug ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Icon icon="solar:calendar-bold-duotone" className="h-3.5 w-3.5" />
                  {item.anneeSlug}
                </span>
              ) : null}
            </div>
            {item.programmeClasse ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">{item.programmeClasse}</span>
                {item.programmeFiliere ? ` · ${item.programmeFiliere}` : ""}
                {item.programmeCredits ? ` · ${item.programmeCredits} cr.` : ""}
              </p>
            ) : null}
          </>
        );
      case "labo":
        return (
          <>
            {item.matiereReference ? (
              <p className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Icon icon="solar:diploma-bold-duotone" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="line-clamp-2">{item.matiereReference}</span>
              </p>
            ) : null}
            {item.lecteursLabel ? (
              <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Lecteurs :</span> {item.lecteursLabel}
              </p>
            ) : null}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {removing ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 px-4 text-center dark:bg-gray-900/85"
          role="status"
          aria-live="polite"
        >
          <Icon icon="svg-spinners:ring-resize" className="h-8 w-8 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-midnight_text dark:text-white">Suppression en cours…</p>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5 pt-6">
        {/* Header avec icône et type */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
              <Icon icon={getResourceIcon(resourceType)} className="h-5 w-5 text-primary" />
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {getResourceLabel(resourceType)}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-800">
            <Icon icon="solar:wallet-money-bold-duotone" className="h-3.5 w-3.5 text-primary" />
            {item.amount} {item.currency}
          </span>
        </div>

        {/* Titre et ID */}
        <h3 className="mt-4 line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
          {item.designation}
        </h3>
        <p className="mt-1 font-mono text-[11px] text-gray-400">
          <Icon icon="solar:hashtag-bold-duotone" className="mr-0.5 inline h-3 w-3" />
          {item.id.slice(-10)}
        </p>

        {/* Toggle Publication */}
        <div
          className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${
            active
              ? "border-primary/35 bg-primary/[0.07] dark:border-primary/40 dark:bg-primary/10"
              : "border-gray-200/90 bg-gray-50/90 dark:border-gray-700 dark:bg-gray-800/60"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-midnight_text dark:text-white">Publication</p>
            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
              {active ? "Visible sur le service étudiant" : "Inactive"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={switching}
            onClick={() => onToggleStatus?.(item)}
            className={`relative h-8 w-[3.25rem] shrink-0 rounded-full border-2 transition-all ${
              active
                ? "border-primary/50 bg-primary"
                : "border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform ${
                active ? "translate-x-[1.25rem]" : "translate-x-0"
              }`}
            >
              {switching ? <Icon icon="svg-spinners:ring-resize" className="size-3.5 text-primary" /> : null}
            </span>
          </button>
        </div>

        {/* Informations spécifiques */}
        {renderSpecificInfo()}

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Link
            href={`/modalites/${resourceType === "labo" ? "laboratoires" : `${resourceType}s`}/${item.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-midnight_text transition hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800/80 dark:hover:bg-gray-800"
          >
            <Icon icon="solar:eye-bold-duotone" className="h-4 w-4 text-primary" />
            Vérifier paiement
          </Link>
          <Link
            href={`/section/${getSectionPath(resourceType)}/${getResourcePath(resourceType)}/${item.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary/10 px-3 py-2 text-xs font-semibold text-primary dark:bg-primary/20"
          >
            <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4" />
            Frais à payer
          </Link>
          <button
            type="button"
            onClick={() => onDelete?.(item)}
            disabled={isDeleting !== undefined ? !isDeleting : false}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            aria-label="Supprimer"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function getSectionPath(type: ResourceType): string {
  switch (type) {
    case "session":
      return "enrollements";
    case "validation":
      return "fiches-validation";
    case "releve":
      return "releves";
    case "labo":
      return "laboratoires";
    default:
      return "";
  }
}

function getResourcePath(type: ResourceType): string {
  switch (type) {
    case "session":
      return "sessions";
    case "validation":
      return "validations";
    case "releve":
      return "releves";
    case "labo":
      return "labos";
    default:
      return "";
  }
}
