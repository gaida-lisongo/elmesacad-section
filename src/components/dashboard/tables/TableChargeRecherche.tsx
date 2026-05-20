"use client";

import { useCallback, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { SujetResourceRow } from "@/actions/organisateurSujetResources";
import type { StageResourceRow } from "@/actions/organisateurStageResources";
import {
  deleteOrganisateurSujetResourceAction,
  listOrganisateurSujetResourcesAction,
  patchOrganisateurSujetResourceStatusAction,
} from "@/actions/organisateurSujetResources";
import {
  deleteOrganisateurStageResourceAction,
  listOrganisateurStageResourcesAction,
  patchOrganisateurStageResourceStatusAction,
} from "@/actions/organisateurStageResources";
import { updateSectionJuryAction } from "@/actions/sectionUpdateJury";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import type { AgentListItem } from "@/lib/services/UserManager";
import type { ChargeRechercheTablePayload } from "@/lib/dashboard/loadOrganisateurCrTableData";

type TabId = "jury" | "sujets" | "stages";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "jury", label: "Jury", icon: "mdi:account-group" },
  { id: "sujets", label: "Ressources Sujets", icon: "mdi:library" },
  { id: "stages", label: "Ressources Stages", icon: "mdi:briefcase-clock" },
];

const PUBLICATION_ACTIVE = new Set(["active", "published", "disponible"]);
function isActive(status: string) {
  return PUBLICATION_ACTIVE.has((status || "").toLowerCase());
}

type JuryMemberOption = {
  id: string;
  nom: string;
  email: string;
  matricule: string;
  role: "president" | "secretaire" | "membre";
};

function creditsLabel(credit: number, programmes: { slug: string; credits: number }[], ref: string) {
  if (credit > 0) return `${credit} crédit${credit !== 1 ? "s" : ""}`;
  const p = programmes.find((x) => x.slug === ref);
  if (p && p.credits > 0) return `${p.credits} crédit${p.credits !== 1 ? "s" : ""} (prog.)`;
  return "—";
}

function programmeLabel(slug: string, programmes: { slug: string; designation: string }[]) {
  return programmes.find((p) => p.slug === slug)?.designation ?? slug;
}

function useResourceList<T>(
  fetcher: (params: { sectionSlug: string; page: number; limit: number; search: string }) => Promise<{ rows: T[]; total: number; page: number; limit: number }>,
  sectionSlug: string,
  initial: { rows: T[]; total: number; page: number; limit: number }
) {
  const [rows, setRows] = useState<T[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const limit = initial.limit;
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(
    (nextPage: number, q: string) => {
      setError(undefined);
      startTransition(async () => {
        try {
          const res = await fetcher({ sectionSlug, page: nextPage, limit, search: q });
          setRows(res.rows);
          setTotal(res.total);
          setPage(res.page);
        } catch (e) {
          setError((e as Error).message);
        }
      });
    },
    [fetcher, sectionSlug, limit]
  );

  return { rows, setRows, total, page, limit, search, setSearch, pending, error, load, startTransition };
}

function SujetCard({
  row,
  programmes,
  onEdit,
  onDelete,
  onToggle,
  switching,
  removing,
}: {
  row: SujetResourceRow;
  programmes: { slug: string; designation: string; credits: number }[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  switching: boolean;
  removing: boolean;
}) {
  const active = isActive(row.status);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {removing ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 px-4 text-center dark:bg-gray-900/85">
          <Icon icon="svg-spinners:ring-resize" className="h-8 w-8 text-primary" />
          <p className="text-sm font-semibold text-midnight_text dark:text-white">Suppression...</p>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-sky-400 transition-transform duration-300 group-hover:scale-x-100" />
      <div className="flex flex-1 flex-col p-5 pt-6">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
          {row.designation}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-gray-400">
          <Icon icon="solar:hashtag-bold-duotone" className="h-3 w-3" />
          {row.id.slice(-10)}
        </p>
        <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors ${
          active
            ? "border-primary/35 bg-primary/[0.07]"
            : "border-gray-200/90 bg-gray-50/90"
        }`}>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-midnight_text dark:text-white">
              <Icon icon={active ? "solar:eye-bold-duotone" : "solar:eye-closed-bold-duotone"} className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-gray-400"}`} />
              Publication
            </p>
            <p className="mt-0.5 text-[11px] text-gray-600">
              {active ? "Visible" : "Inactive"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={switching}
            onClick={onToggle}
            className={`relative h-8 w-[3.25rem] shrink-0 rounded-full border-2 transition-all duration-300 ${
              active
                ? "border-primary/50 bg-primary shadow-inner shadow-primary/20"
                : "border-gray-300 bg-gray-200"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
              active ? "translate-x-[1.25rem]" : "translate-x-0"
            }`}>
              {switching ? <Icon icon="svg-spinners:ring-resize" className="size-3.5 text-primary" /> : null}
            </span>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-midnight_text">
            <Icon icon="solar:wad-of-money-bold-duotone" className="h-3.5 w-3.5 text-primary" />
            {row.amount} {row.currency}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <Icon icon="solar:book-bold-duotone" className="h-3.5 w-3.5 text-primary" />
            {creditsLabel(row.matiereCredit, programmes, row.matiereReference)}
          </span>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <Icon icon="solar:diploma-bold-duotone" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="line-clamp-2">{programmeLabel(row.matiereReference, programmes) || "—"}</span>
        </p>
        {row.lecteursLabel ? (
          <p className="mt-2 line-clamp-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Lecteurs : </span>
            {row.lecteursLabel}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
          >
            <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4" />
            Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={removing}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function StageCard({
  row,
  programmes,
  onEdit,
  onDelete,
  onToggle,
  switching,
  removing,
}: {
  row: StageResourceRow;
  programmes: { slug: string; designation: string; credits: number }[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  switching: boolean;
  removing: boolean;
}) {
  const active = isActive(row.status);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {removing ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 px-4 text-center dark:bg-gray-900/85">
          <Icon icon="svg-spinners:ring-resize" className="h-8 w-8 text-primary" />
          <p className="text-sm font-semibold text-midnight_text dark:text-white">Suppression...</p>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-sky-400 transition-transform duration-300 group-hover:scale-x-100" />
      <div className="flex flex-1 flex-col p-5 pt-6">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
          {row.designation}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 font-mono text-[11px] text-gray-400">
          <Icon icon="solar:hashtag-bold-duotone" className="h-3 w-3" />
          {row.id.slice(-10)}
        </p>
        <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors ${
          active
            ? "border-primary/35 bg-primary/[0.07]"
            : "border-gray-200/90 bg-gray-50/90"
        }`}>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-midnight_text dark:text-white">
              <Icon icon={active ? "solar:eye-bold-duotone" : "solar:eye-closed-bold-duotone"} className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-gray-400"}`} />
              Publication
            </p>
            <p className="mt-0.5 text-[11px] text-gray-600">
              {active ? "Visible" : "Inactive"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={switching}
            onClick={onToggle}
            className={`relative h-8 w-[3.25rem] shrink-0 rounded-full border-2 transition-all duration-300 ${
              active
                ? "border-primary/50 bg-primary shadow-inner shadow-primary/20"
                : "border-gray-300 bg-gray-200"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
              active ? "translate-x-[1.25rem]" : "translate-x-0"
            }`}>
              {switching ? <Icon icon="svg-spinners:ring-resize" className="size-3.5 text-primary" /> : null}
            </span>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-midnight_text">
            <Icon icon="solar:wad-of-money-bold-duotone" className="h-3.5 w-3.5 text-primary" />
            {row.amount} {row.currency}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <Icon icon="solar:book-bold-duotone" className="h-3.5 w-3.5 text-primary" />
            {creditsLabel(row.matiereCredit, programmes, row.matiereReference)}
          </span>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <Icon icon="solar:diploma-bold-duotone" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="line-clamp-2">{programmeLabel(row.matiereReference, programmes) || "—"}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <Link
            href={`/section/recherche/ressources-stages/stages/${row.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-midnight_text transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Icon icon="solar:cart-check-bold-duotone" className="h-4 w-4 text-primary" />
            Demandes
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
          >
            <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4" />
            Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={removing}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function JuryTabSection({
  title,
  icon,
  juryMembers,
  onUpdate,
  color,
}: {
  title: string;
  icon: string;
  juryMembers: JuryMemberOption[];
  onUpdate: (presidentId: string, secretaireId: string, membreIds: string[]) => Promise<void>;
  color: string;
}) {
  const [president, setPresident] = useState<{ id: string; name: string; email: string } | null>(
    () => {
      const p = juryMembers.find((m) => m.role === "president");
      return p ? { id: p.id, name: p.nom, email: p.email } : null;
    }
  );
  const [secretaire, setSecretaire] = useState<{ id: string; name: string; email: string } | null>(
    () => {
      const s = juryMembers.find((m) => m.role === "secretaire");
      return s ? { id: s.id, name: s.nom, email: s.email } : null;
    }
  );
  const [membres, setMembres] = useState<{ id: string; name: string; email: string }[]>(
    () => juryMembers.filter((m) => m.role === "membre").map((m) => ({ id: m.id, name: m.nom, email: m.email }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await onUpdate(
        president?.id ?? "",
        secretaire?.id ?? "",
        membres.map((m) => m.id)
      );
      setMsg({ type: "success", text: "Jury mis à jour avec succès." });
    } catch (e) {
      setMsg({ type: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const addMembre = (item: AgentListItem) => {
    if (!membres.some((m) => m.id === item.id)) {
      setMembres((prev) => [...prev, { id: item.id, name: item.name, email: item.email }]);
    }
  };

  const removeMembre = (id: string) => {
    setMembres((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-center gap-2">
        <Icon icon={icon} className={`h-5 w-5 ${color}`} />
        <h3 className="text-base font-bold text-midnight_text dark:text-white">{title}</h3>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Président</label>
          {president ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-midnight_text">{president.name}</p>
                {president.email && <p className="truncate text-xs text-gray-500">{president.email}</p>}
              </div>
              <button type="button" onClick={() => setPresident(null)} className="shrink-0 text-xs font-semibold text-rose-600 hover:underline">Retirer</button>
            </div>
          ) : null}
          <UserDatabaseSearch
            key={`${title}-president-${president?.id ?? "void"}`}
            kind="agent"
            placeholder="Rechercher un président..."
            onSelect={(item) => setPresident({ id: item.id, name: item.name, email: item.email })}
            clearOnSelect
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Secrétaire</label>
          {secretaire ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-midnight_text">{secretaire.name}</p>
                {secretaire.email && <p className="truncate text-xs text-gray-500">{secretaire.email}</p>}
              </div>
              <button type="button" onClick={() => setSecretaire(null)} className="shrink-0 text-xs font-semibold text-rose-600 hover:underline">Retirer</button>
            </div>
          ) : null}
          <UserDatabaseSearch
            key={`${title}-secretaire-${secretaire?.id ?? "void"}`}
            kind="agent"
            placeholder="Rechercher un secrétaire..."
            onSelect={(item) => setSecretaire({ id: item.id, name: item.name, email: item.email })}
            clearOnSelect
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Membres</label>
          {membres.length > 0 && (
            <div className="space-y-1.5">
              {membres.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-midnight_text">{m.name}</p>
                    {m.email && <p className="truncate text-xs text-gray-500">{m.email}</p>}
                  </div>
                  <button type="button" onClick={() => removeMembre(m.id)} className="shrink-0 text-xs font-semibold text-rose-600 hover:underline">Retirer</button>
                </div>
              ))}
            </div>
          )}
          <UserDatabaseSearch
            key={`${title}-membres-${membres.length}`}
            kind="agent"
            placeholder="Ajouter un membre..."
            onSelect={addMembre}
            clearOnSelect
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-darkprimary disabled:opacity-50"
        >
          {saving ? <Icon icon="svg-spinners:ring-resize" className="h-4 w-4" /> : <Icon icon="mdi:content-save" className="h-4 w-4" />}
          Enregistrer
        </button>
        {msg && (
          <span className={`text-xs font-semibold ${msg.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TableChargeRecherche({
  sectionSlug,
  sectionDesignation,
  data,
}: {
  sectionSlug: string;
  sectionDesignation: string;
  data: ChargeRechercheTablePayload;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("jury");

  const sujetsState = useResourceList(listOrganisateurSujetResourcesAction, sectionSlug, data.sujetsInitial);
  const stagesState = useResourceList(listOrganisateurStageResourcesAction, sectionSlug, data.stagesInitial);
  const [statusToggleId, setStatusToggleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggleSujet = (row: SujetResourceRow) => {
    const next = !isActive(row.status);
    const nextStatus = next ? "active" : "inactive";
    setStatusToggleId(row.id);
    void (async () => {
      try {
        const updated = await patchOrganisateurSujetResourceStatusAction({ sectionSlug, id: row.id, status: nextStatus });
        sujetsState.setRows((prev) => prev.map((x) => (x.id === row.id ? updated : x)));
      } catch { } finally {
        setStatusToggleId(null);
      }
    })();
  };

  const handleDeleteSujet = (row: SujetResourceRow) => {
    if (!window.confirm(`Supprimer « ${row.designation} » ?`)) return;
    setDeletingId(row.id);
    sujetsState.startTransition(async () => {
      try {
        await deleteOrganisateurSujetResourceAction({ sectionSlug, id: row.id });
        sujetsState.load(sujetsState.page, sujetsState.search);
      } catch { } finally {
        setDeletingId(null);
      }
    });
  };

  const handleToggleStage = (row: StageResourceRow) => {
    const next = !isActive(row.status);
    const nextStatus = next ? "active" : "inactive";
    setStatusToggleId(row.id);
    void (async () => {
      try {
        const updated = await patchOrganisateurStageResourceStatusAction({ sectionSlug, id: row.id, status: nextStatus });
        stagesState.setRows((prev) => prev.map((x) => (x.id === row.id ? updated : x)));
      } catch { } finally {
        setStatusToggleId(null);
      }
    })();
  };

  const handleDeleteStage = (row: StageResourceRow) => {
    if (!window.confirm(`Supprimer « ${row.designation} » ?`)) return;
    setDeletingId(row.id);
    stagesState.startTransition(async () => {
      try {
        await deleteOrganisateurStageResourceAction({ sectionSlug, id: row.id });
        stagesState.load(stagesState.page, stagesState.search);
      } catch { } finally {
        setDeletingId(null);
      }
    });
  };

  const handleJuryUpdate = useCallback(
    async (kind: "cours" | "recherche", presidentId: string, secretaireId: string, membreIds: string[]) => {
      const payload = kind === "cours"
        ? { sectionSlug, cours: { presidentId, secretaireId, membreIds } }
        : { sectionSlug, recherche: { presidentId, secretaireId, membreIds } };
      await updateSectionJuryAction(payload);
    },
    [sectionSlug]
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Icon icon="mdi:flask-outline" className="text-indigo-600 w-6 h-6" />
            Chargé de recherche
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Section : <strong>{sectionDesignation}</strong>
          </p>
        </div>
      </div>

      <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl flex items-center gap-2 ${
                isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon icon={tab.icon} className="h-4 w-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="crTabBorder"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "jury" && (
          <motion.div
            key="jury"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <JuryTabSection
              title="Jury de cours"
              icon="mdi:book-open-variant"
              juryMembers={data.juryCoursMembers}
              onUpdate={(p, s, m) => handleJuryUpdate("cours", p, s, m)}
              color="text-emerald-600"
            />
            <JuryTabSection
              title="Jury de recherche"
              icon="mdi:flask"
              juryMembers={data.juryRechercheMembers}
              onUpdate={(p, s, m) => handleJuryUpdate("recherche", p, s, m)}
              color="text-indigo-600"
            />
          </motion.div>
        )}

        {activeTab === "sujets" && (
          <motion.div
            key="sujets"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Gestion des ressources sujets. Les nouvelles ressources sont créées en <strong>inactive</strong>.
              </p>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={sujetsState.search}
                  onChange={(e) => sujetsState.setSearch(e.target.value)}
                  placeholder="Filtrer..."
                  disabled={sujetsState.pending}
                  className="w-full min-w-[12rem] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-primary/50 sm:w-48"
                />
                <button
                  type="button"
                  onClick={() => sujetsState.load(1, sujetsState.search)}
                  disabled={sujetsState.pending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-midnight_text shadow-sm hover:bg-gray-50"
                >
                  <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
                  Rechercher
                </button>
                <Link
                  href={`/section/recherche/ressources-sujets`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-darkprimary"
                >
                  <Icon icon="solar:add-circle-bold-duotone" className="h-5 w-5" />
                  Nouvelle ressource
                </Link>
              </div>
            </div>

            {sujetsState.error ? (
              <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{sujetsState.error}</p>
              </div>
            ) : null}

            {sujetsState.pending && sujetsState.rows.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50" />
                ))}
              </div>
            ) : sujetsState.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center">
                <Icon icon="solar:documents-bold-duotone" className="mb-3 h-14 w-14 text-gray-400" />
                <p className="font-semibold text-midnight_text">Aucune ressource sujet</p>
              </div>
            ) : (
              <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${sujetsState.pending || !!deletingId ? "pointer-events-none opacity-70" : ""}`}>
                {sujetsState.rows.map((r) => (
                  <SujetCard
                    key={r.id}
                    row={r}
                    programmes={data.programmes}
                    onEdit={() => window.open(`/section/recherche/ressources-sujets?edit=${r.id}`, "_blank")}
                    onDelete={() => handleDeleteSujet(r)}
                    onToggle={() => handleToggleSujet(r)}
                    switching={statusToggleId === r.id}
                    removing={deletingId === r.id}
                  />
                ))}
              </div>
            )}

            {sujetsState.total > 0 && (
              <div className="flex items-center justify-between gap-3 pt-2 text-sm text-gray-600">
                <span>{sujetsState.total} résultat{sujetsState.total > 1 ? "s" : ""} — page {sujetsState.page} / {Math.max(1, Math.ceil(sujetsState.total / sujetsState.limit))}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={sujetsState.page <= 1 || sujetsState.pending}
                    onClick={() => sujetsState.load(sujetsState.page - 1, sujetsState.search)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={sujetsState.pending || sujetsState.page >= Math.ceil(sujetsState.total / sujetsState.limit)}
                    onClick={() => sujetsState.load(sujetsState.page + 1, sujetsState.search)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "stages" && (
          <motion.div
            key="stages"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Gestion des ressources stages. Les nouvelles ressources sont créées en <strong>inactive</strong>.
              </p>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={stagesState.search}
                  onChange={(e) => stagesState.setSearch(e.target.value)}
                  placeholder="Filtrer..."
                  disabled={stagesState.pending}
                  className="w-full min-w-[12rem] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-primary/50 sm:w-48"
                />
                <button
                  type="button"
                  onClick={() => stagesState.load(1, stagesState.search)}
                  disabled={stagesState.pending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-midnight_text shadow-sm hover:bg-gray-50"
                >
                  <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
                  Rechercher
                </button>
                <Link
                  href={`/section/recherche/ressources-stages`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-darkprimary"
                >
                  <Icon icon="solar:add-circle-bold-duotone" className="h-5 w-5" />
                  Nouvelle ressource
                </Link>
              </div>
            </div>

            {stagesState.error ? (
              <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{stagesState.error}</p>
              </div>
            ) : null}

            {stagesState.pending && stagesState.rows.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50" />
                ))}
              </div>
            ) : stagesState.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center">
                <Icon icon="solar:documents-bold-duotone" className="mb-3 h-14 w-14 text-gray-400" />
                <p className="font-semibold text-midnight_text">Aucune ressource stage</p>
              </div>
            ) : (
              <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${stagesState.pending || !!deletingId ? "pointer-events-none opacity-70" : ""}`}>
                {stagesState.rows.map((r) => (
                  <StageCard
                    key={r.id}
                    row={r}
                    programmes={data.programmes}
                    onEdit={() => window.open(`/section/recherche/ressources-stages?edit=${r.id}`, "_blank")}
                    onDelete={() => handleDeleteStage(r)}
                    onToggle={() => handleToggleStage(r)}
                    switching={statusToggleId === r.id}
                    removing={deletingId === r.id}
                  />
                ))}
              </div>
            )}

            {stagesState.total > 0 && (
              <div className="flex items-center justify-between gap-3 pt-2 text-sm text-gray-600">
                <span>{stagesState.total} résultat{stagesState.total > 1 ? "s" : ""} — page {stagesState.page} / {Math.max(1, Math.ceil(stagesState.total / stagesState.limit))}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={stagesState.page <= 1 || stagesState.pending}
                    onClick={() => stagesState.load(stagesState.page - 1, stagesState.search)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={stagesState.pending || stagesState.page >= Math.ceil(stagesState.total / stagesState.limit)}
                    onClick={() => stagesState.load(stagesState.page + 1, stagesState.search)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}