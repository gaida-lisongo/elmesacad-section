"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierRessourceCore from "@/app/paiement/_components/metier/PaiementMetierRessourceCore";
import { generateMacaronPdfAction } from "@/actions/macaronGenerate";
import { downloadPdfFromBase64 } from "@/lib/paiement/downloadPdfFromBase64";
import {
  buildDocumentMacaronPayload,
  extractSessionMatieresFromProduitDetail,
} from "@/lib/paiement/sessionEnrollementContext";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  produitDetail: PaiementProduitDetailRecord | null;
  etudiant: PaiementEtudiantLocalView | null;
  busy?: boolean;
  onRecheck?: () => void;
};

function pickRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export default function PaiementMetierSessionPanel({
  commande,
  commandeId,
  produitDetail,
  etudiant,
  busy,
  onRecheck,
}: Props) {
  const id = String(commandeId || commande.id || "").trim();
  const [generating, setGenerating] = useState(false);

  const cours = useMemo(() => extractSessionMatieresFromProduitDetail(produitDetail), [produitDetail]);

  const detailRecord = useMemo(() => {
    if (!produitDetail || typeof produitDetail !== "object" || Array.isArray(produitDetail)) return null;
    return produitDetail as Record<string, unknown>;
  }, [produitDetail]);

  const programme = detailRecord ? pickRecord(detailRecord.programme) : null;
  const annee = detailRecord ? pickRecord(detailRecord.annee) : null;

  const handleGenerateMacaron = useCallback(async () => {
    const payload = buildDocumentMacaronPayload({
      commande,
      commandeId: id,
      etudiant,
      produitDetail,
    });
    setGenerating(true);
    try {
      const result = await generateMacaronPdfAction(payload);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      downloadPdfFromBase64(result.pdfBase64, result.filename);
    } catch (e: any) {
      console.error("Erreur lors de la generation: ", e);
    } finally {
      setGenerating(false);
    }
  }, [commande, id, etudiant, produitDetail]);

  return (
    <div className="space-y-4">
      <PaiementMetierRessourceCore
        commande={commande}
        commandeId={id}
        variant="session"
        busy={busy}
        onRecheck={onRecheck}
      />

      <div
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-white to-primary/[0.08] p-1 shadow-xl dark:border-primary/25 dark:from-darklight dark:via-darklight dark:to-primary/15 sm:p-2"
        data-testid="paiement-metier-session-enrollement"
      >
        {/* Cercles décoratifs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl dark:bg-primary/10" />
        <div className="pointer-events-none -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />

        <div className="relative rounded-[22px] bg-white/80 p-5 backdrop-blur-sm dark:bg-darklight/80 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-primary/10 pb-4 dark:border-primary/20">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/30">
              <Icon icon="solar:calendar-date-bold-duotone" className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-midnight_text dark:text-white sm:text-xl">
                Enrôlement — session d&apos;examen
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Détail du produit, parcours et matières concernées par cette commande.
              </p>
            </div>
          </div>

          {/* Cartes infos */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon icon="solar:book-bold-duotone" className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">Produit &amp; année</h4>
              </div>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                  <span className="text-slate-500">Désignation</span>
                  <span className="font-semibold text-midnight_text dark:text-white">{String(detailRecord?.designation ?? "—")}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                  <span className="text-slate-500">Montant</span>
                  <span className="font-bold text-midnight_text dark:text-white">
                    {String(detailRecord?.amount ?? commande.transaction?.amount ?? "—")}{" "}
                    {String(detailRecord?.currency ?? commande.transaction?.currency ?? "")}
                  </span>
                </li>
                {annee ? (
                  <>
                    <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                      <span className="text-slate-500">Année</span>
                      <span className="font-mono text-xs font-semibold text-midnight_text dark:text-white">{String(annee.slug ?? "—")}</span>
                    </li>
                    {(annee.debut != null || annee.fin != null) && (
                      <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                        <span className="text-slate-500">Période</span>
                        <span className="font-semibold text-midnight_text dark:text-white">
                          {String(annee.debut ?? "—")} — {String(annee.fin ?? "—")}
                        </span>
                      </li>
                    )}
                  </>
                ) : (
                  <li className="text-xs text-slate-500">Année académique non renseignée.</li>
                )}
              </ul>
            </article>

            <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Icon icon="solar:user-id-bold-duotone" className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">Promotion (étudiant)</h4>
              </div>
              {etudiant ? (
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                    <span className="text-slate-500">Nom</span>
                    <span className="font-semibold text-midnight_text dark:text-white">{etudiant.name}</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                    <span className="text-slate-500">Matricule</span>
                    <span className="font-semibold text-midnight_text dark:text-white">{etudiant.matricule}</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                    <span className="text-slate-500">Cycle</span>
                    <span className="font-semibold text-midnight_text dark:text-white">{etudiant.cycle || "—"}</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                    <span className="text-slate-500">Diplôme visé</span>
                    <span className="font-semibold text-midnight_text dark:text-white">{etudiant.diplome || "—"}</span>
                  </li>
                  {programme ? (
                    <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-black/20">
                      <span className="text-slate-500">Programme</span>
                      <span className="font-semibold text-midnight_text dark:text-white">{String(programme.designation ?? programme.filiere ?? "—")}</span>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">Profil étudiant local non chargé.</p>
              )}
            </article>
          </div>

          {/* Cours */}
          <article className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Icon icon="solar:notebook-bold-duotone" className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
                Cours concernés ({cours.length})
              </h4>
            </div>
            {cours.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Aucune matière listée sur cette ressource session.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 dark:bg-black/20 dark:text-slate-400">
                      <th className="px-4 py-2.5 font-semibold">Réf.</th>
                      <th className="px-4 py-2.5 font-semibold">Matière</th>
                      <th className="px-4 py-2.5 font-semibold">Crédits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cours.map((row, idx) => (
                      <tr
                        key={row.reference}
                        className={`border-t border-slate-100 transition hover:bg-primary/[0.03] dark:border-slate-800 ${idx % 2 === 1 ? "bg-slate-50/50 dark:bg-black/10" : ""}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.reference}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-midnight_text dark:text-white">{row.designation || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {row.credit > 0 ? row.credit : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {/* Bouton générer */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleGenerateMacaron()}
              disabled={Boolean(busy) || generating}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform group-hover:translate-x-full" />
              <Icon icon={generating ? "solar:spinner-bold-duotone" : "solar:document-add-bold-duotone"} className={`text-lg ${generating ? "animate-spin" : ""}`} aria-hidden />
              {generating ? "Génération en cours…" : "Générer le macaron (PDF)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
