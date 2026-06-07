"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { OrderData } from "../../_components/OrderCard";
import { OrderCard } from "../../_components/OrderCard";

type Props = {
  orders: OrderData[];
  designation: string;
  resourceId: string;
};

type ExportPeriod = "daily" | "weekly" | "monthly" | "semester" | "annual" | "custom";

const EXPORT_PERIODS: { value: ExportPeriod; label: string }[] = [
  { value: "daily", label: "Journalier" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "semester", label: "Semestriel" },
  { value: "annual", label: "Annuel" },
  { value: "custom", label: "Personnalisé" },
];

export default function SessionOrdersClient({ orders, designation, resourceId }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("daily");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Filtres ──────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!trimmed) return true;
      return (
        o.student.nom.toLowerCase().includes(trimmed) ||
        o.student.matricule.toLowerCase().includes(trimmed) ||
        o.student.email.toLowerCase().includes(trimmed) ||
        o.transaction.orderNumber.toLowerCase().includes(trimmed)
      );
    });
  }, [orders, searchTerm, statusFilter]);

  // ── Export Excel ─────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExportError(null);
    setExporting(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams({
        resourceId,
        period: exportPeriod,
        date: today,
      });

      if (exportPeriod === "custom") {
        if (!customStart || !customEnd) {
          setExportError("Veuillez sélectionner une date de début et de fin.");
          setExporting(false);
          return;
        }
        params.set("start", customStart);
        params.set("end", customEnd);
      }

      const res = await fetch(`/api/sessions/orders/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur lors de l'export" }));
        throw new Error(err.message || "Erreur lors de l'export");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commandes-session-${exportPeriod}-${resourceId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }, [resourceId, exportPeriod, customStart, customEnd]);

  const showCustomDate = exportPeriod === "custom";

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <Link
          href="/demandes"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Icon icon="solar:arrow-left-linear" className="h-4 w-4" aria-hidden />
          Demandes
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
              <Icon
                icon="solar:cart-check-bold-duotone"
                className="h-8 w-8 shrink-0 text-primary"
                aria-hidden
              />
              Commandes — {designation}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Ressource{" "}
              <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">{resourceId}</code>
            </p>
          </div>
        </div>
      </header>

      {/* ── Toolbar : Recherche + Export ────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {/* Recherche & Filtre statut */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Icon
                icon="solar:magnifer-linear"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden
              />
              <input
                type="text"
                placeholder="Rechercher par nom, matricule, email ou n° commande…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Statut :
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Tous</option>
                <option value="paid">Payés</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoués</option>
                <option value="completed">Terminés</option>
              </select>
            </div>
          </div>

          {/* Export */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Période :
              </label>
              <select
                value={exportPeriod}
                onChange={(e) => setExportPeriod(e.target.value as ExportPeriod)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {EXPORT_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {showCustomDate && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  title="Date de début"
                />
                <span className="text-xs text-gray-400">→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  title="Date de fin"
                />
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon
                icon={exporting ? "solar:spinner-bold-duotone" : "solar:download-square-bold-duotone"}
                className={`h-5 w-5 ${exporting ? "animate-spin" : ""}`}
                aria-hidden
              />
              {exporting ? "Génération..." : "Export Excel"}
            </button>
          </div>
        </div>

        {/* Erreur d'export */}
        {exportError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <Icon icon="solar:info-circle-bold-duotone" className="h-5 w-5 shrink-0" />
            {exportError}
          </div>
        )}
      </div>

      {/* ── Results count ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredOrders.length}</span>{" "}
          commande{filteredOrders.length !== 1 ? "s" : ""}
          {filteredOrders.length !== orders.length
            ? ` sur ${orders.length} au total`
            : ""}
        </p>
        {filteredOrders.length > 0 && (
          <div className="flex gap-1">
            {["paid", "pending", "failed"].map((s) => {
              const count = filteredOrders.filter((o) => o.status === s).length;
              if (count === 0) return null;
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    s === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : s === "pending"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      s === "paid"
                        ? "bg-green-500"
                        : s === "pending"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Orders grid (4 columns) ───────────────────────────────── */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              renderActions={(o: OrderData) => (
                <button
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                  onClick={() => {
                    console.log("Gérer la commande", o);
                  }}
                >
                  <Icon icon="solar:settings-bold-duotone" className="h-4 w-4" aria-hidden />
                  Gérer
                </button>
              )}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon
            icon="solar:box-minimalistic-broken"
            className="h-16 w-16 text-gray-300 dark:text-gray-600"
          />
          <p className="mt-4 text-lg font-medium text-gray-500 dark:text-gray-400">
            {searchTerm.trim() || statusFilter !== "all"
              ? "Aucune commande ne correspond aux filtres."
              : "Aucune commande pour cette session."}
          </p>
          {(searchTerm.trim() || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
}