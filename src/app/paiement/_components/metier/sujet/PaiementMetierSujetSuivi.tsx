"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getEtudiantSujetCommandeAction } from "@/actions/sujetCommandeActions";
import { generateSujetPageDeGardeAction } from "@/actions/sujetPageDeGardeGenerate";
import { downloadPdfFromBase64 } from "@/lib/paiement/downloadPdfFromBase64";
import type { OrderSujetAdminFields, OrderSujetStudentPayload } from "@/lib/sujet/orderSujetTypes";

type Props = {
  etudiantServiceOrderId: string | undefined;
};

export default function PaiementMetierSujetSuivi({ etudiantServiceOrderId }: Props) {
  const orderId = String(etudiantServiceOrderId ?? "").trim();
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<OrderSujetStudentPayload | null>(null);
  const [admin, setAdmin] = useState<OrderSujetAdminFields | null>(null);

  const [anneeAcad, setAnneeAcad] = useState("2025-2026");
  const [cycle, setCycle] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    console.log("[sujet][suivi] fetch commande microservice", { orderId });
    setLoading(true);
    setErr(null);
    try {
      const res = await getEtudiantSujetCommandeAction(orderId);
      console.log("[sujet][suivi] réponse GET", { ok: res.ok, message: res.ok ? undefined : res.message });
      if (!res.ok) {
        setErr(res.message);
        setPayload(null);
        setAdmin(null);
        return;
      }
      setPayload(res.payload);
      setAdmin(res.admin);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePageDeGarde = async () => {
    if (!orderId || !payload) return;

    if (!anneeAcad.trim()) {
      window.alert("Veuillez choisir une année académique.");
      return;
    }
    if (!cycle.trim()) {
      window.alert("Veuillez saisir votre cycle (ex: Ingénieur, Gradué, Master).");
      return;
    }

    console.log("[sujet][suivi] demande page de garde PDF", { orderId });
    setGeneratingPdf(true);
    try {
      const res = await generateSujetPageDeGardeAction({
        id: orderId,
        titre: payload.titre,
        directeur: payload.directeur,
        co_directeur: payload.co_directeur,
        anneeAcad,
        cycle,
      });
      console.log("[sujet][suivi] PDF", { ok: res.ok, message: res.ok ? undefined : res.message });
      if (!res.ok) {
        window.alert(res.message);
        return;
      }
      downloadPdfFromBase64(res.pdfBase64, res.filename);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!orderId) {
    return (
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        Référence commande service étudiant absente — impossible d&apos;afficher le suivi.
      </p>
    );
  }

  return (
    <div
      className="mt-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:p-5"
      data-testid="paiement-metier-sujet-suivi"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-midnight_text dark:text-white">Suivi — sujet de recherche</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Votre dossier a été transmis. Vous pouvez consulter la note, les observations du jury et générer la page
            de garde lorsque le service les met à jour.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Icon icon="solar:refresh-bold" className="text-base" aria-hidden />
          {loading ? "…" : "Actualiser"}
        </button>
      </div>

      {err ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          {err}
        </p>
      ) : null}

      {payload ? (
        <div className="mt-4 space-y-4 text-sm">
          <div className="space-y-3">
            <p>
              <span className="text-slate-500">Titre :</span>{" "}
              <span className="font-medium text-midnight_text dark:text-white">{payload.titre || "—"}</span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Directeur : {payload.directeur || "—"} · Co-directeur : {payload.co_directeur || "—"}
            </p>
          </div>

          <div className="grid gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Année Académique</label>
              <select
                value={anneeAcad}
                onChange={(e) => setAnneeAcad(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-midnight_text focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="2023-2024">2023-2024</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Cycle (à saisir)</label>
              <input
                type="text"
                placeholder="Ex: Ingénieur, Gradué..."
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-midnight_text focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      ) : !loading && !err ? (
        <p className="mt-3 text-xs text-slate-500">Aucune donnée chargée.</p>
      ) : null}

      <div className="mt-6 rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-xs dark:border-primary/25 dark:bg-primary/10">
        <p className="font-semibold text-midnight_text dark:text-white">Décision &amp; notation (service étudiant)</p>
        <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
          <li>
            <span className="text-slate-500">Note :</span>{" "}
            {admin?.note != null && Number.isFinite(admin.note) ? `${admin.note}/20` : "—"}
          </li>
          <li>
            <span className="text-slate-500">Validation :</span>{" "}
            {admin?.validation === true ? "Oui" : admin?.validation === false ? "Non" : "—"}
          </li>
          <li>
            <span className="text-slate-500">Observations :</span>{" "}
            {admin?.observations != null && admin.observations !== ""
              ? typeof admin.observations === "object"
                ? JSON.stringify(admin.observations)
                : String(admin.observations)
              : "—"}
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap justify-end">
          <button
            type="button"
            disabled={generatingPdf}
            onClick={() => void handlePageDeGarde()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-midnight_text hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            <Icon icon="solar:document-text-bold-duotone" className="text-lg" aria-hidden />
            {generatingPdf ? "PDF…" : "Page de garde (PDF)"}
          </button>
        </div>
      </div>
    </div>
  );
}
