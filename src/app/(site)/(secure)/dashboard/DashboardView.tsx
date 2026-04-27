"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import type {
  DashboardAdminCapabilities,
  DashboardViewProps,
  DashboardTableRow,
} from "@/lib/dashboard/types";
import FilieresDataTableSection from "@/components/filiere/FilieresDataTableSection";
const PAGE_SIZE = 10;
const TABLE_HEADERS_BASE = ["Nom", "E-mail", "Matricule", "Statut", "Type"];

const DEFAULT_ADMIN_CAPABILITIES: DashboardAdminCapabilities = {
  canManageUserAccounts: false,
  canManageFilieres: false,
  canReadTransactions: false,
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const SERIES_STACK_COLORS = [
  "bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-500 dark:to-amber-300",
  "bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-300",
  "bg-gradient-to-t from-red-600 to-red-400 dark:from-red-500 dark:to-red-300",
];

function RechargeStatusStackedChart({
  year,
  seriesList,
}: {
  year: number;
  seriesList: { variable: string; data: { month: string; value: number }[] }[];
}) {
  const monthCount = seriesList[0]?.data.length ?? 12;
  const sums = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < monthCount; i++) {
      let s = 0;
      for (const se of seriesList) {
        s += se.data[i]?.value ?? 0;
      }
      out.push(s);
    }
    return out;
  }, [seriesList, monthCount]);

  const max = useMemo(() => Math.max(1, ...sums), [sums]);

  return (
    <div>
      <p className="text-xs text-gray-500 transition-colors dark:text-gray-400">
        Recharges par statut — année {year} (calendrier)
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-600 dark:text-gray-400">
        {seriesList.map((s, si) => (
          <span key={s.variable} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block size-2.5 rounded-sm ${SERIES_STACK_COLORS[si] ?? "bg-gray-400"}`}
              aria-hidden
            />
            {s.variable}
          </span>
        ))}
      </div>
      <div className="mt-3 flex h-48 gap-0.5 sm:gap-1">
        {Array.from({ length: monthCount }, (_, i) => {
          const sum = sums[i] ?? 0;
          const colFrac = sum / max;
          return (
            <div
              key={seriesList[0]?.data[i]?.month ?? i}
              className="group/col flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-end"
              title={`Total ${sum} — ${seriesList[0]?.data[i]?.month ?? ""} ${year}`}
            >
              <div className="flex min-h-0 w-full flex-1 flex-col justify-end">
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t transition-all"
                  style={{
                    height: `${colFrac * 100}%`,
                    minHeight: sum > 0 ? 4 : 0,
                  }}
                >
                  {sum > 0 &&
                    seriesList.map((se, j) => {
                      const v = se.data[i]?.value ?? 0;
                      if (v <= 0) return null;
                      const h = (v / sum) * 100;
                      return (
                        <div
                          key={se.variable}
                          className={`w-full ${SERIES_STACK_COLORS[j] ?? "bg-gray-500"} shadow-sm transition hover:brightness-110`}
                          style={{
                            height: `${h}%`,
                            minHeight: 3,
                          }}
                          title={`${se.variable}: ${v}`}
                        />
                      );
                    })}
                </div>
              </div>
              <span className="pt-1 text-center text-[10px] text-gray-500 transition-colors group-hover/col:text-sky-600 dark:text-gray-400 dark:group-hover/col:text-sky-300 max-w-full truncate">
                {seriesList[0]?.data[i]?.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AnneeFormState = { designation: string; debut: string; fin: string; status: boolean };

function formatAnneeTitle(debut: number, fin: number) {
  return `Année ${debut} - ${fin}`;
}

function StatusSwitch({
  active,
  disabled,
  onToggle,
  busy,
}: {
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "Désactiver" : "Activer"}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
        active
          ? "bg-gradient-to-r from-primary to-secondary shadow-sm shadow-primary/20"
          : "bg-gray-200 dark:bg-gray-600"
      } ${disabled ? "pointer-events-none cursor-not-allowed opacity-60" : "hover:scale-105 active:scale-95"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow-md transition-transform duration-300 ease-out ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
        aria-hidden
      >
        {busy ? (
          <Icon icon="svg-spinners:ring-resize" className="size-3.5 text-sky-600" />
        ) : active ? (
          "✓"
        ) : null}
      </span>
    </button>
  );
}

function AdminAnneeBlock({
  items: initial,
}: {
  items: DashboardViewProps["whiteList"];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AnneeFormState>({
    designation: "",
    debut: String(new Date().getFullYear()),
    fin: String(new Date().getFullYear() + 1),
    status: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy("create");
    try {
      const res = await fetch("/api/annee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: form.designation.trim(),
          debut: Number(form.debut) || 0,
          fin: Number(form.fin) || 0,
          status: form.status,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Échec");
      setForm((f) => ({ ...f, designation: "" }));
      setFormOpen(false);
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (id: string, status: boolean) => {
    setErr(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/annee/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Échec");
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette année académique ?")) return;
    setErr(null);
    setBusy(`del-${id}`);
    try {
      const res = await fetch(`/api/annee/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Échec");
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Années académiques</h2>
        <button
          type="button"
          onClick={() => {
            setFormOpen((o) => !o);
            setErr(null);
          }}
          className="group inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-50/90 px-3 py-2 text-xs font-medium text-sky-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-sky-500/50 hover:bg-sky-100 hover:shadow-md active:scale-[0.98] dark:border-sky-500/25 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:border-sky-400/40 dark:hover:bg-sky-900/60"
        >
          <Icon
            icon={formOpen ? "solar:close-circle-linear" : "solar:add-circle-linear"}
            className="size-4 transition-transform duration-300 group-hover:rotate-90"
            aria-hidden
          />
          <span>{formOpen ? "Fermer" : "Ajouter une année"}</span>
        </button>
      </div>

      {err && (
        <p className="animate-dashboard-in text-xs text-red-600" role="alert">
          {err}
        </p>
      )}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            inert={!formOpen}
            aria-hidden={!formOpen}
            onSubmit={onCreate}
            className="space-y-3 rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-white p-4 shadow-sm dark:border-sky-900/50 dark:from-sky-950/40 dark:to-gray-900/80"
          >
            <p className="text-xs font-medium text-midnight_text/80 dark:text-gray-300">Nouvelle année</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-midnight_text shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-gray-600 dark:bg-gray-800/90 dark:text-white"
                placeholder="Désignation (optionnel, ex. 2023-2024)"
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white/50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800/50">
                <span className="text-xs text-gray-500">Actif</span>
                <StatusSwitch
                  active={form.status}
                  busy={false}
                  disabled={false}
                  onToggle={() => setForm((f) => ({ ...f, status: !f.status }))}
                />
              </div>
              <input
                type="number"
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/90"
                placeholder="Année début"
                value={form.debut}
                onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))}
              />
              <input
                type="number"
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/90"
                placeholder="Année fin"
                value={form.fin}
                onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy === "create" || !formOpen}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-semibold text-white shadow-md transition duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "create" ? (
                  <Icon icon="svg-spinners:ring-resize" className="size-4" />
                ) : (
                  <Icon icon="solar:check-circle-linear" className="size-4" />
                )}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>

      <ul className="max-h-52 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5">
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
            Aucune année enregistrée.
          </li>
        )}
        {items.map((it, idx) => {
          const title = formatAnneeTitle(it.debut, it.fin);
          const sub =
            it.designation.trim() && it.designation !== title ? it.designation.trim() : null;
          return (
            <li
              key={it.id ?? it.slug}
              className="animate-dashboard-in"
              style={{ animationDelay: `${idx * 45}ms` }}
            >
              <div className="group/row flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/90 px-3 py-3 shadow-sm transition duration-300 hover:border-sky-200/60 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-sky-800/60">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tracking-tight text-midnight_text dark:text-white">{title}</p>
                  {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {it.id && (
                    <StatusSwitch
                      active={it.status}
                      busy={busy === it.id}
                      disabled={busy != null}
                      onToggle={() => void toggleStatus(it.id!, it.status)}
                    />
                  )}
                  {it.id && (
                    <button
                      type="button"
                      title="Supprimer"
                      disabled={busy != null}
                      onClick={() => onDelete(it.id!)}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200/80 text-red-600 transition duration-200 hover:scale-105 hover:border-red-400 hover:bg-red-50 active:scale-95 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      {busy === `del-${it.id}` ? (
                        <Icon icon="svg-spinners:ring-resize" className="size-4" />
                      ) : (
                        <Icon icon="solar:trash-bin-trash-linear" className="size-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type MailAction = { rowId: string; kind: "create" | "reset" } | null;

function AdminUserTableBlock({
  listes,
  filters,
  canManageAccounts,
}: {
  listes: string[];
  filters: string[];
  canManageAccounts: boolean;
}) {
  const [listI, setListI] = useState(0);
  const [filterI, setFilterI] = useState(() => {
    const i = filters.indexOf("Inactifs");
    return i >= 0 ? i : 0;
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<DashboardTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mail, setMail] = useState<MailAction>(null);

  const listLabel = listes[listI] ?? listes[0] ?? "Étudiants";
  const userType: "Agent" | "Student" = /^agents$/i.test(listLabel.trim()) ? "Agent" : "Student";
  const filterKey = filters[filterI] ?? "Tous";
  const statusParam =
    filterKey === "Actifs" ? "active" : filterKey === "Inactifs" ? "inactive" : "all";

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("userType", userType === "Agent" ? "Agent" : "Student");
      sp.set("status", statusParam);
      sp.set("search", debouncedSearch.trim());
      sp.set("page", String(page));
      sp.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/dashboard/users?${sp.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Chargement impossible");
      setRows(j.data as DashboardTableRow[]);
      setTotal(typeof j.total === "number" ? j.total : 0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userType, statusParam, debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [userType, statusParam, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [page, pageSafe]);

  const onMail = async (email: string, kind: "create" | "reset", rowId: string) => {
    if (!email) return;
    setErr(null);
    setMail({ rowId, kind });
    try {
      const res = await fetch("/api/dashboard/mail-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: kind }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Action impossible");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setMail(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Liste
          <select
            className="ml-1 mt-0.5 block rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={listI}
            onChange={(e) => setListI(Number(e.target.value))}
          >
            {listes.map((l, i) => (
              <option key={l} value={i}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Filtre
          <select
            className="ml-1 mt-0.5 block rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={filterI}
            onChange={(e) => setFilterI(Number(e.target.value))}
          >
            {filters.map((f, i) => (
              <option key={f} value={i}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[10rem] flex-1 text-xs text-gray-600 dark:text-gray-300 sm:min-w-[14rem]">
          Recherche
          <input
            className="mt-0.5 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            placeholder="Nom, e-mail, matricule"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {err && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {err}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {TABLE_HEADERS_BASE.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500"
                >
                  {header}
                </th>
              ))}
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Aucun résultat
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const email = row.columns[1] ?? "";
                const busy =
                  mail?.rowId === row.id &&
                  (mail.kind === "create" || mail.kind === "reset");
                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 transition-colors hover:bg-sky-50/50 dark:border-gray-800 dark:hover:bg-sky-950/20"
                  >
                    {row.columns.map((col, idx) => (
                      <td
                        key={`${row.id}-c${idx}`}
                        className="px-3 py-2 text-gray-700 dark:text-gray-200"
                      >
                        {col}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {canManageAccounts ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => void onMail(email, "create", row.id)}
                            className="rounded border border-sky-500/60 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-300"
                          >
                            {busy && mail?.kind === "create" ? "…" : "Créer compte"}
                          </button>
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => void onMail(email, "reset", row.id)}
                            className="rounded border border-amber-500/60 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200"
                          >
                            {busy && mail?.kind === "reset" ? "…" : "Réinitialiser"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Non autorisé</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          {total} résultat{total > 1 ? "s" : ""} — page {page + 1} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600"
          >
            Préc.
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600"
          >
            Suiv.
          </button>
        </div>
      </div>
    </div>
  );
}

type RechargeRow = {
  id: string;
  studentName: string;
  studentMatricule: string;
  amount: number;
  currency: "USD" | "CDF";
  status: "pending" | "paid" | "failed";
  createdAt: string;
};

function TransactionsPanel() {
  const [rows, setRows] = useState<RechargeRow[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<"all" | "pending" | "paid" | "failed">("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams();
      sp.set("page", "0");
      sp.set("limit", "8");
      sp.set("status", status);
      sp.set("search", debouncedSearch.trim());
      const res = await fetch(`/api/recharges?${sp.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Chargement transactions impossible");
      setRows(Array.isArray(j.data) ? (j.data as RechargeRow[]) : []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <article className="animate-dashboard-in w-full min-w-0 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
      <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Détail des recharges</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="rounded border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="Nom, matricule, montant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | "pending" | "paid" | "failed")}
        >
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="paid">Payé</option>
          <option value="failed">Échoué</option>
        </select>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 py-1.5 text-xs text-gray-500">Étudiant</th>
              <th className="px-2 py-1.5 text-xs text-gray-500">Montant</th>
              <th className="px-2 py-1.5 text-xs text-gray-500">Statut</th>
              <th className="px-2 py-1.5 text-xs text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={4}>
                  Chargement...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={4}>
                  Aucune transaction
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-1.5">
                    <p className="text-sm text-midnight_text dark:text-white">{r.studentName}</p>
                    <p className="text-[11px] text-gray-500">{r.studentMatricule}</p>
                  </td>
                  <td className="px-2 py-1.5">
                    {r.amount} {r.currency}
                  </td>
                  <td className="px-2 py-1.5">{r.status}</td>
                  <td className="px-2 py-1.5">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ReadonlyUserTable({ rows, headers }: { rows: DashboardTableRow[]; headers: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-gray-500"
              >
                Aucune donnée pour l’instant
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
              >
                {row.columns.map((col, idx) => (
                  <td
                    key={`${row.id}-c${idx}`}
                    className="px-3 py-2 text-gray-700 dark:text-gray-200"
                  >
                    {col}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardView(props: DashboardViewProps) {
  const {
    title,
    role,
    userName,
    infoMessage,
    ui,
    agentAuthorizations = [],
    adminCapabilities = DEFAULT_ADMIN_CAPABILITIES,
    metrics,
    whiteList,
    chartData,
    tableData,
    chartYear,
  } = props;

  const isStudentMinimal =
    !ui.showMetricsRow && ui.anneesMode === "hidden" && ui.usersTableMode === "hidden";

  const showAdminUsersTable =
    role !== "admin" ||
    agentAuthorizations.length === 0 ||
    adminCapabilities.canManageUserAccounts;

  return (
    <section className="w-full min-w-0 space-y-6">
      <header className="animate-dashboard-in">
        <h1 className="text-2xl font-bold tracking-tight text-midnight_text dark:text-white md:text-3xl">
          {title}
        </h1>
        {userName && (
          <p className="mt-1 text-sm text-gray-600 transition dark:text-gray-400">Bonjour, {userName}</p>
        )}
        {ui.subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{ui.subtitle}</p>
        )}
        {infoMessage && (
          <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900 transition-all duration-300 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {infoMessage}
          </p>
        )}
      </header>

      {isStudentMinimal ? (
        <article
          className="animate-dashboard-in rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-gray-600 dark:bg-gray-900/40"
          style={{ animationDelay: "160ms" }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Les statistiques et raccourcis de votre parcours étudiant seront regroupés ici.
          </p>
        </article>
      ) : (
        <>
          {ui.showMetricsRow && metrics.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.slice(0, 3).map((metric, mi) => (
                <article
                  key={`${metric.title}-${mi}`}
                  className="animate-dashboard-in group rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 p-4 shadow-sm transition duration-500 ease-out hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/50 dark:shadow-gray-950/30 dark:hover:shadow-lg"
                  style={{ animationDelay: `${80 + mi * 70}ms` }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {metric.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-midnight_text transition group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
                    {metric.value}
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100/80 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-700 ease-out dark:from-sky-400 dark:to-secondary"
                      style={{ width: `${Math.min(100, Math.max(0, metric.progress))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 tabular-nums dark:text-gray-400">
                    {metric.progress}%
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-5">
            <article
              className="animate-dashboard-in rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-sky-50/20 p-4 shadow-sm transition duration-500 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-sky-950/10 dark:hover:shadow-sky-950/20 lg:col-span-3"
              style={{ animationDelay: "200ms" }}
            >
              <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Recharges</h2>
              {ui.showRechargesChart && chartData.length > 0 ? (
                <div className="mt-2">
                  <RechargeStatusStackedChart year={chartYear} seriesList={chartData} />
                </div>
              ) : (
                <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 transition dark:border-gray-700">
                  {role === "admin"
                    ? "Aucune donnée de recharge sur la période."
                    : "Graphique réservé à l’administration."}
                </div>
              )}
            </article>

            {ui.anneesMode !== "hidden" && (
              <article
                className="animate-dashboard-in rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-sky-50/30 p-4 shadow-sm transition duration-500 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-sky-950/20 dark:hover:shadow-sky-950/20 lg:col-span-2"
                style={{ animationDelay: "260ms" }}
              >
                {ui.anneesMode === "crud" ? (
                  <AdminAnneeBlock items={whiteList} />
                ) : (
                  <div>
                    <h2 className="text-sm font-semibold text-midnight_text dark:text-white">
                      Années académiques
                    </h2>
                    {whiteList.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-500">Aucune année publiée.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {whiteList.slice(0, 12).map((w, wi) => (
                          <li
                            key={w.slug}
                            className="flex animate-dashboard-in items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm transition hover:border-sky-200/50 dark:border-gray-800 dark:bg-gray-800/50"
                            style={{ animationDelay: `${wi * 40}ms` }}
                          >
                            <span className="font-medium text-midnight_text dark:text-white">
                              {formatAnneeTitle(w.debut, w.fin)}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                w.status
                                  ? "bg-primary/15 text-primary dark:text-primary"
                                  : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {w.status ? "actif" : "inactif"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            )}
          </div>

          {ui.usersTableMode !== "hidden" && showAdminUsersTable && (
            <article
              className="animate-dashboard-in rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-sm transition duration-500 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/50 dark:hover:shadow-gray-900/30"
              style={{ animationDelay: "320ms" }}
            >
              <h2 className="mb-2 text-sm font-semibold text-midnight_text dark:text-white">
                {role === "admin" ? "Comptes utilisateurs" : "Utilisateurs"}
              </h2>
              {ui.usersTableMode === "admin" ? (
                <AdminUserTableBlock
                  listes={tableData.listes}
                  filters={tableData.filters}
                  canManageAccounts={adminCapabilities.canManageUserAccounts}
                />
              ) : (
                <ReadonlyUserTable rows={tableData.rows} headers={tableData.headers} />
              )}
            </article>
          )}

          {role === "admin" &&
            (adminCapabilities.canManageFilieres || adminCapabilities.canReadTransactions) && (
              <div
                className={`grid w-full min-w-0 gap-4 ${
                  adminCapabilities.canManageFilieres && adminCapabilities.canReadTransactions
                    ? "lg:grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {adminCapabilities.canManageFilieres && (
                  <div className="min-w-0">
                    <FilieresDataTableSection />
                  </div>
                )}
                {adminCapabilities.canReadTransactions && (
                  <div className="min-w-0">
                    <TransactionsPanel />
                  </div>
                )}
              </div>
            )}
        </>
      )}
    </section>
  );
}
