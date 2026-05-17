"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import { generateDemandesRapportAction, type RapportResult } from "@/actions/demandesRapportActions";

type ResourceWithDemandes = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  demandesCount: number;
  demandesPaid: number;
  demandesPending: number;
};

type Props = {
  type: "session" | "validation" | "releve" | "labo";
  typeLabel: string;
  typeIcon: string;
  sectionSlug: string;
  sectionDesignation: string;
  resources: ResourceWithDemandes[];
  initialError?: string;
  detailPath: string;
};

const TYPE_CONFIG = {
  session: {
    label: "Sessions",
    color: "blue",
    bgColor: "bg-blue-500",
    lightBg: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  validation: {
    label: "Validations",
    color: "green",
    bgColor: "bg-green-500",
    lightBg: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  releve: {
    label: "Relevés",
    color: "purple",
    bgColor: "bg-purple-500",
    lightBg: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  labo: {
    label: "Laboratoires",
    color: "amber",
    bgColor: "bg-amber-500",
    lightBg: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
};

const PERIOD_LABELS: Record<string, string> = {
  daily: "Journalier",
  monthly: "Mensuel",
  semester: "Semestriel",
  annual: "Annuel",
};

function isPublicationActive(status: string): boolean {
  const st = (status || "").toLowerCase();
  return st === "active" || st === "published" || st === "disponible";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DemandesRessourcesClient({
  type,
  typeLabel,
  sectionSlug,
  sectionDesignation,
  resources,
  initialError,
  detailPath,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [showRapportPanel, setShowRapportPanel] = useState(false);
  const [rapportPeriod, setRapportPeriod] = useState<string>("monthly");
  const [rapportResult, setRapportResult] = useState<RapportResult | null>(null);
  const [rapportError, setRapportError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const config = TYPE_CONFIG[type];

  const filteredResources = resources.filter((r) =>
    r.designation.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalDemandes = resources.reduce((sum, r) => sum + r.demandesCount, 0);
  const totalPaid = resources.reduce((sum, r) => sum + r.demandesPaid, 0);
  const totalPending = resources.reduce((sum, r) => sum + r.demandesPending, 0);

  const handleGenerateRapport = () => {
    if (resources.length === 0) {
      setRapportError("Aucune ressource disponible pour générer un rapport.");
      return;
    }
    setRapportError(null);
    setRapportResult(null);
    startTransition(async () => {
      try {
        const result = await generateDemandesRapportAction({
          type,
          period: rapportPeriod as "daily" | "monthly" | "semester" | "annual",
          resourceIds: resources.map((r) => r.id),
          sectionSlug,
          typeLabel,
        });
        setRapportResult(result);
      } catch (e) {
        setRapportError((e as Error).message);
      }
    });
  };

  const handleDownloadCsv = () => {
    if (!rapportResult || rapportResult.rows.length === 0) return;
    const headers = ["Ressource", "Matricule", "Email", "Paiement", "Référence", "N° Commande", "Date"];
    const rows = rapportResult.rows.map((r) => [
      r.ressourceDesignation,
      r.matricule,
      r.studentEmail,
      r.payment,
      r.reference,
      r.orderNumber,
      r.date,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demandes-${type}-${rapportPeriod}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link
            href="/demandes"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600 dark:text-gray-400">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgColor} text-white`}>
                {type === "session" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                  </svg>
                )}
                {type === "validation" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                )}
                {type === "releve" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                )}
                {type === "labo" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3L7 17H17L15 3H9zm3 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm1-6H11V7h2v4z"/>
                  </svg>
                )}
              </span>
              Demandes — {typeLabel}
            </h1>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-gray-400">Section :</span> <strong>{sectionDesignation}</strong>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Error */}
      {initialError ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p>{initialError}</p>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-xl border ${config.borderColor} ${config.lightBg} p-4 dark:bg-opacity-10`}>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total demandes</p>
          <p className={`text-2xl font-bold ${config.textColor}`}>{totalDemandes}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:bg-green-900/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">Payées</p>
          <p className="text-2xl font-bold text-green-700">{totalPaid}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
          <p className="text-2xl font-bold text-amber-700">{totalPending}</p>
        </div>
      </div>

      {/* Rapport Section */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setShowRapportPanel(!showRapportPanel)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Icon icon="solar:chart-square-bold-duotone" className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-bold text-midnight_text dark:text-white">Rapport des demandes</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Générer un rapport périodique des demandes (Journalier, Mensuel, Semestriel, Annuel)
              </p>
            </div>
          </div>
          <Icon
            icon={showRapportPanel ? "solar:alt-arrow-up-bold-duotone" : "solar:alt-arrow-down-bold-duotone"}
            className="h-5 w-5 text-gray-400"
          />
        </button>

        {showRapportPanel && (
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["daily", "monthly", "semester", "annual"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setRapportPeriod(period)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      rapportPeriod === period
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {PERIOD_LABELS[period]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGenerateRapport}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-darkprimary disabled:opacity-50"
              >
                {pending ? (
                  <Icon icon="svg-spinners:ring-resize" className="h-5 w-5" />
                ) : (
                  <Icon icon="solar:document-text-bold-duotone" className="h-5 w-5" />
                )}
                {pending ? "Génération..." : "Générer le rapport"}
              </button>
            </div>

            {/* Rapport Error */}
            {rapportError ? (
              <div className="mt-4 flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{rapportError}</p>
              </div>
            ) : null}

            {/* Rapport Result */}
            {rapportResult ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-center dark:border-gray-600 dark:bg-gray-800/60">
                    <p className="text-lg font-bold text-midnight_text dark:text-white">{rapportResult.totalCommandes}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Total</p>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-green-50/80 p-3 text-center dark:border-green-900/40 dark:bg-green-900/10">
                    <p className="text-lg font-bold text-green-700">{rapportResult.totalPaid}</p>
                    <p className="text-[10px] uppercase tracking-wide text-green-600">Payées</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-center dark:border-amber-900/40 dark:bg-amber-900/10">
                    <p className="text-lg font-bold text-amber-700">{rapportResult.totalPending}</p>
                    <p className="text-[10px] uppercase tracking-wide text-amber-600">En attente</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3 text-center dark:border-primary/30">
                    <p className="text-lg font-bold capitalize text-primary">
                      {PERIOD_LABELS[rapportResult.period] || rapportResult.period}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Période</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Généré le {formatDate(rapportResult.generatedAt)} — {rapportResult.rows.length} ligne(s)
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={rapportResult.rows.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-40"
                  >
                    <Icon icon="solar:export-bold-duotone" className="h-4 w-4" />
                    Télécharger CSV
                  </button>
                </div>

                {rapportResult.rows.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Ressource</th>
                          <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Matricule</th>
                          <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Email</th>
                          <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Paiement</th>
                          <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">N° Commande</th>
                          <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rapportResult.rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                          >
                            <td className="max-w-[10rem] truncate px-3 py-2 font-medium text-midnight_text dark:text-white">
                              {row.ressourceDesignation}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{row.matricule}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.studentEmail}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  row.payment?.toLowerCase() === "success" ||
                                  row.payment?.toLowerCase() === "paid" ||
                                  row.payment?.toLowerCase() === "completed"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                }`}
                              >
                                {row.payment}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                              {row.orderNumber || row.reference?.slice(-8)}
                            </td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-500">
                              {formatDate(row.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-8 text-center dark:border-gray-600 dark:bg-gray-900/40">
                    <Icon icon="solar:document-text-bold-duotone" className="mb-2 h-10 w-10 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aucune demande trouvée pour cette période.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-midnight_text dark:text-white">
            Ressources avec demandes
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Cliquez sur une ressource pour voir les détails des demandes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Rechercher une ressource..."
            className="w-full min-w-[14rem] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-64"
          />
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="currentColor" className="mb-3 text-gray-400">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <p className="font-semibold text-midnight_text dark:text-white">Aucune ressource trouvée</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {searchText ? "Aucun résultat pour votre recherche." : "Aucune ressource n'a encore été créée."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((r) => {
            const active = isPublicationActive(r.status);
            return (
              <Link
                key={r.id}
                href={`/demandes/${type === "labo" ? "laboratoires" : `${type}s`}/${r.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      active 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                    {r.amount} {r.currency}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
                  {r.designation}
                </h3>
                <p className="mt-1 font-mono text-[11px] text-gray-400">
                  #{r.id.slice(-8)}
                </p>

                {/* Demandes Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                    <p className="text-lg font-bold text-midnight_text dark:text-white">{r.demandesCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Total</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-2 text-center dark:bg-green-900/20">
                    <p className="text-lg font-bold text-green-700">{r.demandesPaid}</p>
                    <p className="text-[10px] uppercase tracking-wide text-green-600">Payées</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-900/20">
                    <p className="text-lg font-bold text-amber-700">{r.demandesPending}</p>
                    <p className="text-[10px] uppercase tracking-wide text-amber-600">En attente</p>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Voir les demandes
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary transition-transform group-hover:translate-x-1">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
