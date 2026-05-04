"use client";

import { Icon } from "@iconify/react";
import type { AgentListItem } from "@/lib/services/UserManager";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";

export function formatAgentDirecteurLabel(agent: AgentListItem): string {
  return `${agent.name.trim()} — ${agent.matricule.trim()}`;
}

type Props = {
  id: string;
  label: string;
  /** Libellé envoyé au service étudiant (directeur / co_directeur). */
  value: string;
  onPick: (agent: AgentListItem) => void;
  onClear: () => void;
};

export default function SujetAgentPickField({ id, label, value, onPick, onClear }: Props) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/80">
          <span className="min-w-0 flex-1 font-medium text-midnight_text dark:text-white">{value}</span>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon icon="solar:pen-new-round-bold" className="text-sm" aria-hidden />
            Changer
          </button>
        </div>
      ) : (
        <UserDatabaseSearch
          kind="agent"
          id={id}
          onSelect={(item) => onPick(item)}
          placeholder="Rechercher un agent (nom, e-mail, matricule)…"
          listboxAppendToBody
        />
      )}
    </div>
  );
}
