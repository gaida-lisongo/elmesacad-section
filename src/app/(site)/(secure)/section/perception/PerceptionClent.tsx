"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  getMyPercepteur,
  getPerceptionStatsAction,
  listPerceptionOrdersAction,
  validateOrderAction,
  type PerceptionOrderRow,
} from "@/actions/perceptionActions";

/* ─── Types ─────────────────────────────────────────── */
type ResourceBrief = { id: string; designation: string; amount: number; currency: string };

type Props = {
  sectionSlug: string;
  sectionDesignation: string;
  resources: ResourceBrief[];
};

type TabKey = "pending" | "validated";

/* ─── Format monnaie ────────────────────────────────── */
const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur }).format(n);

/* ─── Status badge ──────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "En attente", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
    paid: { label: "Payé", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  };
  const m = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

/* ─── Ligne de commande ─────────────────────────────── */
function OrderRow({
  order,
  onValidate,
  validating,
}: {
  order: PerceptionOrderRow;
  onValidate: (id: string) => void;
  validating: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon icon="solar:user-id-bold-duotone" className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="truncate font-semibold text-sm">{order.student.matricule || "N/A"}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Icon icon="solar:letter-bold-duotone" className="h-3 w-3" />
            {order.student.email}
          </span>
          {order.transaction.orderNumber && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:bill-list-bold-duotone" className="h-3 w-3" />
              Réf. {order.transaction.orderNumber}
            </span>
          )}
          {order.transaction.phoneNumber && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:phone-bold-duotone" className="h-3 w-3" />
              {order.transaction.phoneNumber}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon icon="solar:calendar-bold-duotone" className="h-3 w-3" />
            {new Date(order.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="whitespace-nowrap font-bold text-midnight_text dark:text-white">
          {fmt(order.transaction.amount, order.transaction.currency)}
        </span>
        {order.status === "ok" && (
          <button
            onClick={() => onValidate(order._id)}
            disabled={validating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Icon icon="solar:check-circle-bold-duotone" className="h-4 w-4" />
            Valider
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Sélecteur de période (export Excel) ───────────── */
const PERIODS = [
  { value: "daily", label: "Journalier", icon: "solar:calendar-linear" },
  { value: "weekly", label: "Hebdomadaire", icon: "solar:calendar-mark-linear" },
  { value: "monthly", label: "Mensuel", icon: "solar:calendar-search-linear" },
  { value: "custom", label: "Personnalisé", icon: "solar:calendar-date-linear" },
] as const;

function ExportDropdown({
  resourceId,
  onExporting,
}: {
  resourceId: string;
  onExporting: (v: boolean) => void;
}) {
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
    onExporting(true);
    try {
      const params = new URLSearchParams({ resourceId, period });
      // Si custom, demander les dates
      if (period === "custom") {
        const start = prompt("Date début (YYYY-MM-DD) :");
        if (!start) { onExporting(false); return; }
        const end = prompt("Date fin (YYYY-MM-DD) :");
        if (!end) { onExporting(false); return; }
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
    onExporting(false);
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

/* ─── Section de métriques ──────────────────────────── */
function MetricsBar({
  stats,
}: {
  stats: { pending: number; paid: number; total: number; pendingAmount: number; paidAmount: number } | null;
}) {
  if (!stats) return null;
  return (
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
  );
}

/* ════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ════════════════════════════════════════════════════════ */
export default function PerceptionClient({ sectionSlug, sectionDesignation, resources }: Props) {
  /* Resource sélectionnée */
  const [selectedResource, setSelectedResource] = useState<ResourceBrief | null>(
    resources.length === 1 ? resources[0] : null
  );

  /* Tab */
  const [tab, setTab] = useState<TabKey>("pending");
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "pending", label: "En attente", icon: "solar:clock-circle-bold-duotone" },
    { key: "validated", label: "Validées", icon: "solar:check-circle-bold-duotone" },
  ];

  /* Stats */
  const [stats, setStats] = useState<{
    pending: number;
    paid: number;
    total: number;
    pendingAmount: number;
    paidAmount: number;
  } | null>(null);

  /* Commandes tab1 (pending) */
  const [pendingOrders, setPendingOrders] = useState<PerceptionOrderRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingLoading, setPendingLoading] = useState(false);

  /* Commandes tab2 (validées) */
  const [paidOrders, setPaidOrders] = useState<PerceptionOrderRow[]>([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [paidPage, setPaidPage] = useState(1);
  const [paidSearch, setPaidSearch] = useState("");
  const [paidLoading, setPaidLoading] = useState(false);

  const [validatingId, setValidatingId] = useState<string | null>(null);

  /* Percepteur check */
  const [percepteurOk, setPercepteurOk] = useState(true);
  const [percepteurChecking, setPercepteurChecking] = useState(true);

  const LIMIT = 4;

  /* ── Vérification percepteur ──────────────────────── */
  useEffect(() => {
    (async () => {
      setPercepteurChecking(true);
      const res = await getMyPercepteur();
      if (!res.success) setPercepteurOk(false);
      setPercepteurChecking(false);
    })();
  }, []);

  /* ── Charger stats ────────────────────────────────── */
  const loadStats = useCallback(async (resId: string) => {
    const res = await getPerceptionStatsAction(resId);
    if (res.success) setStats(res.data || null);
  }, []);

  /* ── Charger commandes ────────────────────────────── */
  const loadPending = useCallback(async (resId: string, p: number, q: string) => {
    setPendingLoading(true);
    const res = await listPerceptionOrdersAction({ resourceId: resId, status: "ok", page: p, limit: LIMIT, search: q });
    if (res.success) {
      setPendingOrders(res.rows);
      setPendingTotal(res.total);
      setPendingPage(res.page);
    }
    setPendingLoading(false);
  }, []);

  const loadPaid = useCallback(async (resId: string, p: number, q: string) => {
    setPaidLoading(true);
    const res = await listPerceptionOrdersAction({ resourceId: resId, status: "paid", page: p, limit: LIMIT, search: q });
    if (res.success) {
      setPaidOrders(res.rows);
      setPaidTotal(res.total);
      setPaidPage(res.page);
    }
    setPaidLoading(false);
  }, []);

  /* ── Quand la ressource change, recharger tout ────── */
  useEffect(() => {
    if (!selectedResource) return;
    loadStats(selectedResource.id);
    loadPending(selectedResource.id, 1, "");
    loadPaid(selectedResource.id, 1, "");
    setPendingPage(1);
    setPaidPage(1);
    setPendingSearch("");
    setPaidSearch("");
  }, [selectedResource, loadStats, loadPending, loadPaid]);

  /* ── Validation ───────────────────────────────────── */
  const handleValidate = async (orderId: string) => {
    setValidatingId(orderId);
    const res = await validateOrderAction(orderId);
    if (res.success) {
      // Retirer de la liste pending
      setPendingOrders((prev) => prev.filter((o) => o._id !== orderId));
      setPendingTotal((prev) => Math.max(0, prev - 1));

      // Recharger les paid pour inclure la nouvelle
      if (selectedResource) loadPaid(selectedResource.id, 1, "");
      if (selectedResource) loadStats(selectedResource.id);
      setPaidPage(1);
    } else {
      alert(res.error || "Erreur lors de la validation.");
    }
    setValidatingId(null);
  };

  /* ── Search handlers ──────────────────────────────── */
  const [pendingSearchInput, setPendingSearchInput] = useState("");
  const [paidSearchInput, setPaidSearchInput] = useState("");

  const doPendingSearch = () => {
    if (!selectedResource) return;
    setPendingSearch(pendingSearchInput.trim());
    loadPending(selectedResource.id, 1, pendingSearchInput.trim());
  };

  const doPaidSearch = () => {
    if (!selectedResource) return;
    setPaidSearch(paidSearchInput.trim());
    loadPaid(selectedResource.id, 1, paidSearchInput.trim());
  };

  const orders = tab === "pending" ? pendingOrders : paidOrders;
  const total = tab === "pending" ? pendingTotal : paidTotal;
  const page = tab === "pending" ? pendingPage : paidPage;
  const loading = tab === "pending" ? pendingLoading : paidLoading;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perception</h1>
          <p className="text-sm text-gray-500">{sectionDesignation}</p>
        </div>

        {selectedResource && (
          <div className="flex items-center gap-2">
            <ExportDropdown resourceId={selectedResource.id} onExporting={() => {}} />
          </div>
        )}
      </div>

      {/* ── Alert percepteur manquant ───────────────── */}
      {!percepteurChecking && !percepteurOk && (
        <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <Icon icon="solar:danger-triangle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Vous n&apos;avez pas de profil percepteur. Contactez le chef de section.</p>
        </div>
      )}

      {/* ── Sélection de ressource ──────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Session :</label>
        <select
          value={selectedResource?.id ?? ""}
          onChange={(e) => {
            const res = resources.find((r) => r.id === e.target.value) ?? null;
            setSelectedResource(res);
          }}
          className="min-w-[220px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">Sélectionnez une session…</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.designation} — {fmt(r.amount, r.currency)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Stats ───────────────────────────────────── */}
      {selectedResource && stats && <MetricsBar stats={stats} />}

      {/* ── Tabs ────────────────────────────────────── */}
      {selectedResource && (
        <>
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
            {tabs.map((t) => (
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
                  {tab === t.key && (tab === "pending" ? stats?.pending ?? 0 : stats?.paid ?? 0)}
                </span>
              </button>
            ))}
          </div>

          {/* ── Barre de recherche ──────────────────── */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Rechercher par matricule ou email…"
              value={tab === "pending" ? pendingSearchInput : paidSearchInput}
              onChange={(e) => {
                if (tab === "pending") setPendingSearchInput(e.target.value);
                else setPaidSearchInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  tab === "pending" ? doPendingSearch() : doPaidSearch();
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={tab === "pending" ? doPendingSearch : doPaidSearch}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
              Rechercher
            </button>
          </div>

          {/* ── Liste des commandes (4 par page) ────── */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : orders.length === 0 ? (
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
                  : "Les commandes validées apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderRow
                  key={order._id}
                  order={order}
                  onValidate={handleValidate}
                  validating={validatingId === order._id}
                />
              ))}
            </div>
          )}

          {/* ── Pagination ──────────────────────── */}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>
                {total} commande{total > 1 ? "s" : ""} — page {page} / {pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const next = page - 1;
                    if (tab === "pending") loadPending(selectedResource!.id, next, pendingSearch);
                    else loadPaid(selectedResource!.id, next, paidSearch);
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
                >
                  Précédent
                </button>
                <button
                  disabled={page >= pageCount || loading}
                  onClick={() => {
                    const next = page + 1;
                    if (tab === "pending") loadPending(selectedResource!.id, next, pendingSearch);
                    else loadPaid(selectedResource!.id, next, paidSearch);
                  }}
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