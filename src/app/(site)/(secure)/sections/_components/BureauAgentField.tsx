"use client";

import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import { Icon } from "@iconify/react";
import type { AgentListItem } from "@/lib/services/UserManager";

export type AgentPick = {
  id: string;
  name: string;
  email: string;
};

type BureauRef = { _id?: string; name?: string; email?: string } | string | null | undefined;

/** Convertit une ref bureau renvoyée par l’API (populate) en sélection d’UI. */
export function bureauRefToAgentPick(r: BureauRef): AgentPick | null {
  if (r == null) return null;
  if (typeof r === "string") {
    const t = r.trim();
    return t ? { id: t, name: "Agent", email: "" } : null;
  }
  const id = r._id != null ? String(r._id) : "";
  if (!id) return null;
  return { id, name: r.name?.trim() || "—", email: (r.email ?? "").trim() };
}

type BureauAgentFieldProps = {
  /** Si défini, un input caché `name` est rendu (ex. soumission de formulaire parent). */
  name?: string;
  label: string;
  /** Agent choisi (null = aucun) */
  value: AgentPick | null;
  onChange: (next: AgentPick | null) => void;
  disabled?: boolean;
};

/**
 * Affecte un agent au bureau : recherche (nom, e-mail, matricule) puis sélection.
 */
export function BureauAgentField({ name, label, value, onChange, disabled = false }: BureauAgentFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {name ? <input type="hidden" name={name} value={value?.id ?? ""} readOnly /> : null}
      {value && (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-[#082b1c]/15 bg-[#082b1c]/5 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">{value.name}</p>
            {value.email && (
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
                <Icon icon="solar:letter-bold-duotone" className="h-3.5 w-3.5 shrink-0" />
                {value.email}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="shrink-0 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
          >
            Retirer
          </button>
        </div>
      )}

      <div className={disabled ? "pointer-events-none opacity-60" : ""}>
        <UserDatabaseSearch
          key={`${name ?? label}-${value?.id ?? "void"}`}
          kind="agent"
          disabled={disabled}
          placeholder={value ? "Remplacer par un autre agent…" : "Rechercher un agent (nom, e-mail, matricule)…"}
          aria-label={label}
          onSelect={(item: AgentListItem) =>
            onChange({ id: item.id, name: item.name, email: item.email })
          }
          clearOnSelect
        />
      </div>
    </div>
  );
}
