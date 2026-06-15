"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  getPerceptionStatsAction,
  listPendingOrdersAction,
  listValidatedOrdersAction,
  validateOrderAction,
  exportPerceptionOrdersAction,
  type PerceptionOrderRow,
} from "@/actions/perceptionActions";
import { useNotificationSound } from "@/utils/useNotificationSound";

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
  commandesIds: string[];
};

type TabKey = "pending" | "validated";

type NotificationPayload = {
  type: string;
  timestamp: string;
  commande: PerceptionOrderRow;
};

const PAGE_SIZE = 1500;

export const notifyService = 'https://services.inbtp.ac.cd';

/* ─── Utilitaires ───────────────────────────────────── */
const fmt = (n: number, cur = "USD") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur }).format(n);

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
          <span className="truncate font-semibold text-sm">
            {order.ressource.metadata?.fullName || order.student.matricule || "N/A"}
          </span>
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
          {order.ressource.metadata?.productTitle && (
            <span className="flex items-center gap-1">
              <Icon icon="solar:box-bold-duotone" className="h-3 w-3 shrink-0" />
              {order.ressource.metadata.productTitle}
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

function ExportDropdown({
  resourceId,
  commandesIds,
}: {
  resourceId: string;
  commandesIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    setExporting(true);
    try {
      const payload: {
        resourceId: string;
        commandesIds: string[];
        period: "daily" | "weekly" | "monthly" | "custom";
        start?: string;
        end?: string;
      } = { resourceId, commandesIds, period: period as any };

      if (period === "custom") {
        const start = prompt("Date début (YYYY-MM-DD) :");
        if (!start) return;
        const end = prompt("Date fin (YYYY-MM-DD) :");
        if (!end) return;
        payload.start = start;
        payload.end = end;
      }

      const res = await exportPerceptionOrdersAction(payload);
      if (!res.success || !res.data) throw new Error(res.error || "Erreur export");

      const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
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
              disabled={exporting}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
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

/* ─── Carte métrique ────────────────────────────────── */
function MetricCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  tone: "primary" | "amber" | "emerald";
}) {
  const tones = {
    primary: "bg-primary/5 text-primary border-primary/10",
    amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-xl bg-white/60 p-2 dark:bg-black/20">
          <Icon icon={icon} className="h-5 w-5" />
        </div>
      </div>
      {sub && <p className="mt-2 text-xs font-medium opacity-80">{sub}</p>}
    </div>
  );
}

/* ─── Bloc de statistiques ──────────────────────────── */
function MetricsBlock({
  label,
  stats,
}: {
  label: string;
  stats: { pending: number; paid: number; total: number; pendingAmount: number; paidAmount: number } | null;
}) {
  if (!stats) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total commandes"
          value={stats.total}
          sub={`${stats.pending} en attente + ${stats.paid} validées`}
          icon="solar:document-bold-duotone"
          tone="primary"
        />
        <MetricCard
          label="Montant en attente"
          value={fmt(stats.pendingAmount)}
          sub={`${stats.pending} commande${stats.pending > 1 ? "s" : ""}`}
          icon="solar:clock-circle-bold-duotone"
          tone="amber"
        />
        <MetricCard
          label="Montant validé"
          value={fmt(stats.paidAmount)}
          sub={`${stats.paid} commande${stats.paid > 1 ? "s" : ""}`}
          icon="solar:check-circle-bold-duotone"
          tone="emerald"
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ════════════════════════════════════════════════════════ */
export default function PerceptionClient({ agent, resources, commandesIds }: Props) {
  const [selectedResId, setSelectedResId] = useState<string>(resources.length > 0 ? resources[0].id : "");
  const [tab, setTab] = useState<TabKey>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const [orders, setOrders] = useState<PerceptionOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    pending: number;
    paid: number;
    total: number;
    pendingAmount: number;
    paidAmount: number;
  } | null>(null);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [toast, setToast] = useState<NotificationPayload | null>(null);

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === selectedResId) || null,
    [resources, selectedResId]
  );

  /* ── Charger les commandes de la ressource active ─ */
  const loadOrders = useCallback(
    async (resId: string, currentPage: number, q: string, currentTab: TabKey) => {
      if (!resId || !selectedResource) return;
      setLoading(true);
      try {
        const [listRes, statsRes] = await Promise.all([
          currentTab === "pending"
            ? listPendingOrdersAction({
                resourceId: resId,
                percepteurId: selectedResource.perceptionId,
                commandesIds,
                page: currentPage,
                limit: PAGE_SIZE,
                search: q,
              })
            : listValidatedOrdersAction({
                resourceId: resId,
                commandesIds,
                page: currentPage,
                limit: PAGE_SIZE,
                search: q,
              }),
          getPerceptionStatsAction({ resourceId: resId, commandesIds }),
        ]);

        setOrders(listRes.success ? listRes.rows : []);
        setTotal(listRes.success ? listRes.total ?? 0 : 0);
        if (statsRes.success) setStats(statsRes.data || null);
      } finally {
        setLoading(false);
      }
    },
    [commandesIds, selectedResource]
  );
  const { playSound, markInteracted } = useNotificationSound();

  useEffect(() => {
    const eventSource = new EventSource(`${notifyService}/notify?channel=perception`);

    // eventSource.onmessage = (event) => {
    //   const payload = JSON.parse(event.data) as NotificationPayload;
    //   setNotifications((prev) => [payload, ...prev]);

    //   // N'ajouter dynamiquement que si la commande correspond à la ressource sélectionnée
    //   // et qu'elle est en attente (status "ok").
    //   if (
    //     selectedResource &&
    //     payload.commande?.ressource?.reference === selectedResource.reference &&
    //     payload.commande?.status === "ok"
    //   ) {
    //     setOrders((prev) => {
    //       if (prev.some((o) => o._id === payload.commande._id)) return prev;
    //       return [payload.commande, ...prev];
    //     });
    //     setTotal((prev) => prev + 1);
    //     setStats((prev) => {
    //       if (!prev) return prev;
    //       return {
    //         ...prev,
    //         pending: prev.pending + 1,
    //         total: prev.total + 1,
    //         pendingAmount: prev.pendingAmount + (payload.commande.transaction?.amount ?? 0),
    //       };
    //     });
    //     setToast(payload);
    //     setTimeout(() => setToast((current) => (current === payload ? null : current)), 10000);
    //   }
    // };
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as NotificationPayload;
      setNotifications((prev) => [payload, ...prev]);

      if (
        selectedResource &&
        payload.commande?.ressource?.reference === selectedResource.reference &&
        payload.commande?.status === "ok"
      ) {
        // 🛡️ CORRECTION : Sécuriser l'identifiant pour les Server Actions Next.js
        const normalizedCommande = {
          ...payload.commande,
          _id: payload.commande._id || (payload.commande as any).id,
          id: (payload.commande as any).id || payload.commande._id
        };

        setOrders((prev) => {
          if (prev.some((o) => o._id === normalizedCommande._id)) return prev;
          return [normalizedCommande, ...prev];
        });
        
        setTotal((prev) => prev + 1);
        setStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pending: prev.pending + 1,
            total: prev.total + 1,
            pendingAmount: prev.pendingAmount + (normalizedCommande.transaction?.amount ?? 0),
          };
        });
        
        // On passe aussi l'objet corrigé au toast
        setToast({ ...payload, commande: normalizedCommande });
        setTimeout(() => setToast((current) => (current?.commande._id === normalizedCommande._id ? null : current)), 10000);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Erreur EventSource :", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [selectedResource]);

  useEffect(() => {
    console.log("Notifications data : ", notifications);
    if (notifications.length) {
      // Jouer le son seulement pour la dernière notification reçue
      playSound();
    }
  }, [notifications, playSound]);

  /* ── Reset page quand ressource/tab/recherche change ─ */
  useEffect(() => {
    setPage(1);
  }, [selectedResId, tab, searchApplied]);

  /* ── Charger quand nécessaire ─ */
  useEffect(() => {
    if (!selectedResource) return;
    loadOrders(selectedResource.reference, page, searchApplied, tab);
  }, [selectedResource, tab, page, searchApplied, loadOrders]);


  /* ── Validation d'une commande ──────────────────── */
  const handleValidate = useCallback(
    async (orderId: string) => {
      setValidatingId(orderId);
      const res = await validateOrderAction(orderId);
      if (res.success) {
        const commandeData = orders.find((o) => o._id === orderId);
        if (commandeData) {
          try {
            const reqNotify = await fetch(`${notifyService}/notify/payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ commande: commandeData }),
            });
            const resNotify = await reqNotify.json();
            if (!resNotify.success) console.log("Un problème inattendu est survenu lors de la notification");
          } catch (err) {
            console.error("Erreur lors de la notification post-validation :", err);
          }
        }

        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        setTotal((prev) => Math.max(0, prev - 1));
        if (selectedResource) loadOrders(selectedResource.reference, page, searchApplied, tab);
      } else {
        alert(res.error || "Erreur lors de la validation.");
      }
      setValidatingId(null);
    },
    [loadOrders, orders, page, searchApplied, selectedResource]
  );

  /* ── Recherche ──────────────────────────────────── */
  const doSearch = () => {
    setSearchApplied(searchInput);
    setPage(1);
  };

  const goToPage = (next: number) => setPage(next);

  /* ── Pagination ─────────────────────────────────── */
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Toast nouvelle commande */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 max-w-sm animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl dark:border-emerald-800 dark:bg-emerald-950/90">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
                <Icon icon="solar:bell-bold-duotone" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  Nouvelle commande reçue
                </p>
                <p className="mt-0.5 truncate text-sm text-emerald-800 dark:text-emerald-200">
                  {toast.commande.ressource.metadata?.fullName || toast.commande.student.matricule}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {fmt(toast.commande.transaction.amount, toast.commande.transaction.currency)} ·{" "}
                  {toast.commande.ressource.metadata?.productTitle || toast.commande.ressource.produit}
                </p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="shrink-0 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
              >
                <Icon icon="solar:close-circle-bold-duotone" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4"
        onClick={markInteracted}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perception</h1>
          <p className="text-sm text-gray-500">
            {agent?.name} — {agent?.matricule}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Ressource :</label>
            <select
              value={selectedResId}
              onChange={(e) => setSelectedResId(e.target.value)}
              className="min-w-[280px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {resources.map((r, idx) => (
                <option key={r.id} value={r.id}>
                  {r.produit} ({idx + 1})
                </option>
              ))}
            </select>
          </div>
          {selectedResource && <ExportDropdown resourceId={selectedResource.reference} commandesIds={commandesIds} />}
        </div>
      </div>

      {/* Stats ressource */}
      {selectedResource && <MetricsBlock label={`Métriques : ${selectedResource.categorie} / ${selectedResource.reference}`} stats={stats} />}

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
                  {t.key === "pending" ? stats?.pending ?? 0 : stats?.paid ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Rechercher par matricule, email, nom, référence ou produit…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={doSearch}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
            >
              <Icon icon="solar:magnifer-bold-duotone" className="h-4 w-4 text-primary" />
              Rechercher
            </button>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
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
                  : "Les commandes que vous validez apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  onValidate={handleValidate}
                  validating={validatingId === order._id}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && !loading && (
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
