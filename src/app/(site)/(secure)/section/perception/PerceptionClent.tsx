"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { validateOrderAction, type PerceptionOrderRow } from "@/actions/perceptionActions";

/* ─── Types ─────────────────────────────────────────── */
export type ResourceItem = {
  id: string;
  perceptionId: string;
  categorie: string;
  reference: string;
  produit: string;
};

type Props = {
  agent: any;
  resources: ResourceItem[];
  allCommandes: any[];
  globalMetrics: {
    tCommandes: number;
    amountCollected: number;
    tRessources: number;
  };
};

type TabKey = "pending" | "validated";

const LIMIT = 4;

/* ─── Utilitaires ───────────────────────────────────── */
const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur }).format(n);

const normalize = (order: any): PerceptionOrderRow => {
  const c = order || {};
  return {
    _id: c._id?.toString?.() ?? String(c._id),
    student: {
      matricule: c.student?.matricule ?? "",
      email: c.student?.email ?? "",
    },
    ressource: {
      categorie: c.ressource?.categorie ?? "",
      reference: c.ressource?.reference ?? "",
      produit: c.ressource?.produit ?? "",
    },
    transaction: {
      orderNumber: c.transaction?.orderNumber ?? "",
      amount: c.transaction?.amount ?? 0,
      currency: c.transaction?.currency ?? "USD",
      phoneNumber: c.transaction?.phoneNumber ?? "",
    },
    status: c.status ?? "pending",
    createdAt: c.createdAt?.toISOString?.() ?? String(c.createdAt),
  };
};

/* ─── Status badge ──────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "En attente", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
    paid: { label: "Payé", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  };
  const m = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

/* ─── Carte de commande ─────────────────────────────── */
function OrderCard({
  order,
  onValidate,
  validating,
}: {
  order: PerceptionOrderRow;
  onValidate: (id: string) => void;
  validating: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-sm">{order.student.matricule || "N/A"}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Icon icon="solar:letter-bold-duotone" className="h-3 w-3 shrink-0" />
            {order.student.email}
          </span>
          {order.transaction.orderNumber && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:bill-list-bold-duotone" className="h-3 w-3 shrink-0" />
              Réf. {order.transaction.orderNumber}
            </span>
          )}
          {order.transaction.phoneNumber && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:phone-bold-duotone" className="h-3 w-3 shrink-0" />
              {order.transaction.phoneNumber}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon icon="solar:calendar-bold-duotone" className="h-3 w-3 shrink-0" />
            {new Date(order.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="whitespace-nowrap font-bold text-midnight_text dark:text-white">
          {fmt(order.transaction.amount, order.transaction.currency)}
        </span>
        {order.status === "ok" && (
          <button
            onClick={() => onValidate(order._id)}
            disabled={validating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Icon icon="solar:check-circle-bold-duotone" className="h-4 w-4" />
            Valider
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Export dropdown ───────────────────────────────── */
const PERIODS = [
  { value: "daily", label: "Journalier", icon: "solar:calendar-linear" },
  { value: "weekly", label: "Hebdomadaire", icon: "solar:calendar-mark-linear" },
  { value: "monthly", label: "Mensuel", icon: "solar:calendar-search-linear" },
  { value: "custom", label: "Personnalisé", icon: "solar:calendar-date-linear" },
] as const;

function ExportDropdown({ resourceId }: { resourceId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doExport = async (period: string) => {
    setOpen(false);
    try {
      const params = new URLSearchParams({ resourceId, period });
      if (period === "custom") {
        const start = prompt("Date début (YYYY-MM-DD) :");
        if (!start) return;
        const end = prompt("Date fin (YYYY-MM-DD) :");
        if (!end) return;
        params.set("start", start);
        params.set("end", end);
      }
      const res = await fetch(`/api/sessions/orders/export?${params}`);
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commandes-${period}-${resourceId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export.");
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm dark:border-gray-600 dark:bg-gray-900"
      >
        <Icon icon="solar:file-download-bold-duotone" className="h-4 w-4 text-primary" />
        Exporter
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-600 dark:bg-gray-900">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => doExport(p.value)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Icon icon={p.icon} className="h-4 w-4 text-gray-400" />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Barre de métriques ────────────────────────────── */
function MetricsBar({
  label,
  stats,
}: {
  label: string;
  stats: { pending: number; paid: number; total: number; pendingAmount: number; paidAmount: number } | null;
}) {
  if (!stats) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/5 px-3 py-1.5 font-semibold text-primary">
          <Icon icon="solar:document-bold-duotone" className="h-3.5 w-3.5" />
          Total {stats.total}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <Icon icon="solar:clock-circle-bold-duotone" className="h-3.5 w-3.5" />
          {stats.pending} en attente · {fmt(stats.pendingAmount)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Icon icon="solar:check-circle-bold-duotone" className="h-3.5 w-3.5" />
          {stats.paid} validées · {fmt(stats.paidAmount)}
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ════════════════════════════════════════════════════════ */
export default function PerceptionClient({ agent, resources, allCommandes, globalMetrics }: Props) {
  const [selectedResId, setSelectedResId] = useState<string>(resources.length > 0 ? resources[0].id : "");
  const [tab, setTab] = useState<TabKey>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<PerceptionOrderRow[]>([]);
  const [paidIds, setPaidIds] = useState<Set<string>>(() => new Set());

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === selectedResId) || null,
    [resources, selectedResId]
  );

  /* ── Initialiser la liste locale à partir de allCommandes ─ */
  useEffect(() => {
    const normalized = (allCommandes || []).map(normalize);
    setOrders(normalized);
    const paid = new Set<string>();
    normalized.forEach((o) => {
      if (o.status === "paid") paid.add(o._id);
    });
    setPaidIds(paid);
  }, [allCommandes]);

  /* ── Filtrage côté client ───────────────────────── */
  const filteredOrders = useMemo(() => {
    let list = orders;

    if (selectedResource) {
      list = list.filter((o) => o.ressource.reference === selectedResource.reference);
    }

    if (tab === "pending") {
      list = list.filter((o) => o.status === "ok" && !paidIds.has(o._id));
    } else {
      list = list.filter((o) => o.status === "paid" || paidIds.has(o._id));
    }

    const q = searchApplied.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.student.matricule.toLowerCase().includes(q) ||
          o.student.email.toLowerCase().includes(q)
      );
    }

    return list;
  }, [orders, selectedResource, tab, searchApplied, paidIds]);

  /* ── Métriques ──────────────────────────────────── */
  const globalStats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "ok" && !paidIds.has(o._id));
    const paid = orders.filter((o) => o.status === "paid" || paidIds.has(o._id));
    return {
      pending: pending.length,
      paid: paid.length,
      total: orders.length,
      pendingAmount: pending.reduce((s, o) => s + o.transaction.amount, 0),
      paidAmount: paid.reduce((s, o) => s + o.transaction.amount, 0),
    };
  }, [orders, paidIds]);

  const resourceStats = useMemo(() => {
    if (!selectedResource) return null;
    const resourceOrders = orders.filter((o) => o.ressource.reference === selectedResource.reference);
    const pending = resourceOrders.filter((o) => o.status === "ok" && !paidIds.has(o._id));
    const paid = resourceOrders.filter((o) => o.status === "paid" || paidIds.has(o._id));
    return {
      pending: pending.length,
      paid: paid.length,
      total: resourceOrders.length,
      pendingAmount: pending.reduce((s, o) => s + o.transaction.amount, 0),
      paidAmount: paid.reduce((s, o) => s + o.transaction.amount, 0),
    };
  }, [orders, selectedResource, paidIds]);

  /* ── Pagination ─────────────────────────────────── */
  const total = filteredOrders.length;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  const safePage = Math.min(page, pageCount);
  const pagedOrders = filteredOrders.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  useEffect(() => {
    setPage(1);
  }, [selectedResId, tab, searchApplied]);

  /* ── Validation d'une commande ──────────────────── */
  const handleValidate = useCallback(async (orderId: string) => {
    setValidatingId(orderId);
    const res = await validateOrderAction(orderId);
    if (res.success) {
      setPaidIds((prev) => new Set(prev).add(orderId));
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: "paid" } : o))
      );
    } else {
      alert(res.error || "Erreur lors de la validation.");
    }
    setValidatingId(null);
  }, []);

  /* ── Recherche ──────────────────────────────────── */
  const doSearch = () => {
    setSearchApplied(searchInput);
    setPage(1);
  };

  const goToPage = (next: number) => setPage(next);

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perception</h1>
          <p className="text-sm text-gray-500">
            {agent?.name} — {agent?.matricule}
          </p>
        </div>
        {selectedResId && <ExportDropdown resourceId={selectedResId} />}
      </div>

      {/* Métriques globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
          <p className="text-xs text-gray-500">Commandes totales</p>
          <p className="text-2xl font-bold">{globalMetrics.tCommandes}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
          <p className="text-xs text-gray-500">Montant collecté</p>
          <p className="text-2xl font-bold">{fmt(globalMetrics.amountCollected)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
          <p className="text-xs text-gray-500">Ressources gérées</p>
          <p className="text-2xl font-bold">{globalMetrics.tRessources}</p>
        </div>
      </div>

      {/* Sélection de ressource */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Ressource :</label>
        <select
          value={selectedResId}
          onChange={(e) => setSelectedResId(e.target.value)}
          className="min-w-[280px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.categorie} / {r.reference} ({r.produit})
            </option>
          ))}
        </select>
      </div>

      {/* Métriques globales + ressource */}
      {selectedResource && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <MetricsBar label="Métriques globales" stats={globalStats} />
          <MetricsBar label={`Métriques : ${selectedResource.categorie} / ${selectedResource.reference}`} stats={resourceStats} />
        </div>
      )}

      {/* Tabs */}
      {selectedResource && (
        <>
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
            {(
              [
                { key: "pending" as TabKey, label: "En attente", icon: "solar:clock-circle-bold-duotone" },
                { key: "validated" as TabKey, label: "Validées", icon: "solar:check-circle-bold-duotone" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  tab === t.key
                    ? "bg-white text-midnight_text shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Icon icon={t.icon} className="h-4 w-4" />
                {t.label}
                <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] dark:bg-gray-600">
                  {t.key === "pending" ? resourceStats?.pending ?? 0 : resourceStats?.paid ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Rechercher par matricule ou email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={doSearch}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
              Rechercher
            </button>
          </div>

          {/* Liste */}
          {pagedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center dark:border-gray-600 dark:bg-gray-900/40">
              <Icon
                icon={tab === "pending" ? "solar:inbox-archive-bold-duotone" : "solar:check-circle-bold-duotone"}
                className="mb-3 h-14 w-14 text-gray-300 dark:text-gray-600"
              />
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                {tab === "pending" ? "Aucune commande en attente" : "Aucune commande validée"}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {tab === "pending"
                  ? "Les commandes des étudiants apparaîtront ici après le scan du QR code."
                  : "Les commandes que vous validez apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pagedOrders.map((order) => (
                <OrderCard key={order._id} order={order} onValidate={handleValidate} validating={validatingId === order._id} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {total} commande{total > 1 ? "s" : ""} — page {safePage} / {pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={safePage <= 1}
                  onClick={() => goToPage(safePage - 1)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
                >
                  Précédent
                </button>
                <button
                  disabled={safePage >= pageCount}
                  onClick={() => goToPage(safePage + 1)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
