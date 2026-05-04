"use client";

import Image from "next/image";
import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import type { AgentListItem } from "@/lib/services/UserManager";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";

export type SectionAuthorizationTab =
  | "appariteur"
  | "secretaire"
  | "president"
  | "secretaire-jury"
  | "membre";

export type JuryKind = "cours" | "recherche";

export type SectionAuthorizationPreset = {
  tab: SectionAuthorizationTab;
  label: string;
  designation: string;
  badge: string;
  requiresJuryKind?: boolean;
};

export const SECTION_AUTHORIZATION_PRESETS: SectionAuthorizationPreset[] = [
  { tab: "appariteur", label: "Appariteur", designation: "Appariteur", badge: "Gestionnaires" },
  { tab: "secretaire", label: "Secrétaire", designation: "Secrétaire", badge: "Gestionnaires" },
  { tab: "president", label: "Président", designation: "Président", badge: "Jury", requiresJuryKind: true },
  {
    tab: "secretaire-jury",
    label: "Secrétaire",
    designation: "Secrétaire (jury)",
    badge: "Jury",
    requiresJuryKind: true,
  },
  { tab: "membre", label: "Membre", designation: "Membre", badge: "Jury", requiresJuryKind: true },
];

export type SectionAuthorizationItem = {
  id: string;
  tab: SectionAuthorizationTab;
  juryKind?: JuryKind;
  designation: string;
  contextLabel: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentMatricule: string;
  agentRole: string;
  agentPhoto: string;
};

const defaultPhoto = "/images/user.jpg";

export function resolveJuryKindLabel(kind: JuryKind): string {
  return kind === "cours" ? "Jury de cours" : "Jury de recherche";
}

export function resolveAuthorizationPayload(
  preset: SectionAuthorizationPreset,
  juryKind: JuryKind
): { designation: string; contextLabel: string } {
  if (!preset.requiresJuryKind) {
    return { designation: preset.designation, contextLabel: preset.badge };
  }
  const juryLabel = resolveJuryKindLabel(juryKind);
  return {
    designation: `${preset.designation} (${juryLabel})`,
    contextLabel: juryLabel,
  };
}

export function resolveTabLabel(tab: SectionAuthorizationTab): string {
  const preset = SECTION_AUTHORIZATION_PRESETS.find((x) => x.tab === tab);
  return preset?.label ?? tab;
}

export function resolveDesignationForItem(
  tab: SectionAuthorizationTab,
  juryKind?: JuryKind
): { designation: string; contextLabel: string } {
  const preset = SECTION_AUTHORIZATION_PRESETS.find((x) => x.tab === tab);
  if (!preset) {
    return { designation: tab, contextLabel: "Section" };
  }
  if (!preset.requiresJuryKind) {
    return { designation: preset.designation, contextLabel: preset.badge };
  }
  const kind = juryKind ?? "cours";
  const juryLabel = resolveJuryKindLabel(kind);
  return {
    designation: `${preset.designation} (${juryLabel})`,
    contextLabel: juryLabel,
  };
}

export function SectionAuthorizationCardItem({ item }: { item: SectionAuthorizationItem }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/90 p-5 shadow-[0_4px_24px_-4px_rgba(5, 138, 197,0.12),0_8px_16px_-8px_rgba(0,0,0,0.08)] ring-1 ring-gray-200/80 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(5, 138, 197,0.18),0_4px_12px_-4px_rgba(0,0,0,0.08)] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 dark:ring-gray-700/80">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/8 to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-md ring-2 ring-white dark:ring-gray-800">
          <Image
            src={item.agentPhoto || defaultPhoto}
            alt={item.agentName}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-base font-bold tracking-tight text-midnight_text dark:text-white">
              {item.agentName}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary dark:bg-primary/15 dark:text-emerald-300">
              <Icon icon="solar:shield-keyhole-bold-duotone" className="h-3.5 w-3.5" />
              {item.contextLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{item.designation}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
            <Icon icon="solar:letter-bold-duotone" className="h-4 w-4 shrink-0 text-primary/70" />
            {item.agentEmail}
          </p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-gray-100/80 backdrop-blur-sm dark:bg-gray-800/50 dark:ring-gray-700/60">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Matricule
          </p>
          <p className="mt-1 font-semibold text-midnight_text dark:text-white">{item.agentMatricule}</p>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-gray-100/80 backdrop-blur-sm dark:bg-gray-800/50 dark:ring-gray-700/60">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Rôle agent
          </p>
          <p className="mt-1 font-semibold capitalize text-midnight_text dark:text-white">{item.agentRole || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function SectionAuthorizationCardCreate({
  preset,
}: {
  preset: SectionAuthorizationPreset;
}) {
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);
  const [juryKind, setJuryKind] = useState<JuryKind>("cours");

  const payload = useMemo(
    () => resolveAuthorizationPayload(preset, juryKind),
    [preset, juryKind]
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-50/95 to-white p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] ring-1 ring-gray-200/90 dark:from-gray-900 dark:to-gray-900 dark:ring-gray-700">
      <input type="hidden" name="agentId" value={selectedAgent?.id ?? ""} readOnly />
      <input type="hidden" name="tab" value={preset.tab} readOnly />
      {preset.requiresJuryKind ? <input type="hidden" name="juryKind" value={juryKind} readOnly /> : null}
      <input type="hidden" name="designation" value={payload.designation} readOnly />

      <div className="grid gap-4 rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-gray-900/40">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Agent concerné
          </label>
          <UserDatabaseSearch
            kind="agent"
            clearOnSelect
            placeholder="Rechercher un agent (nom, e-mail, matricule)…"
            onSelect={setSelectedAgent}
          />
        </div>

        {preset.requiresJuryKind && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Type de jury
            </label>
            <select
              value={juryKind}
              onChange={(event) => setJuryKind(event.target.value as JuryKind)}
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white"
            >
              <option value="cours">Jury de cours</option>
              <option value="recherche">Jury de recherche</option>
            </select>
          </div>
        )}

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
          <p className="font-semibold text-midnight_text dark:text-white">Autorisation à attribuer</p>
          <p className="mt-1 font-medium">{payload.designation}</p>
        </div>

        {selectedAgent ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary dark:text-emerald-300">
              Agent sélectionné
            </p>
            <div className="mt-2 flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-700">
                <Image
                  src={selectedAgent.photo || defaultPhoto}
                  alt={selectedAgent.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">
                  {selectedAgent.name}
                </p>
                <p className="truncate text-xs text-gray-600 dark:text-gray-300">{selectedAgent.email}</p>
                <p className="text-xs text-gray-500">Matricule: {selectedAgent.matricule}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Sélectionnez un agent pour attribuer cette autorisation.
          </p>
        )}

        <button
          type="submit"
          disabled={!selectedAgent}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition duration-300 hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
          Attribuer l&apos;autorisation
        </button>
      </div>
    </div>
  );
}
