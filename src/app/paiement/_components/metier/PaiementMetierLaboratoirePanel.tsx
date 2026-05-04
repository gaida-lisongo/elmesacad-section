"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierRessourceCore from "@/app/paiement/_components/metier/PaiementMetierRessourceCore";
import { generateBonLaboratoirePdfAction } from "@/actions/bonLaboratoireGenerate";
import { buildDocumentBonLaboratoirePayload } from "@/lib/paiement/documentBonLaboratoirePayload";
import { downloadPdfFromBase64 } from "@/lib/paiement/downloadPdfFromBase64";

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

export default function PaiementMetierLaboratoirePanel({
  commande,
  commandeId,
  produitDetail,
  etudiant,
  busy,
  onRecheck,
}: Props) {
  const id = String(commandeId || commande.id || "").trim();
  const [generating, setGenerating] = useState(false);

  const detailRecord = useMemo(() => {
    if (!produitDetail || typeof produitDetail !== "object" || Array.isArray(produitDetail)) return null;
    return produitDetail as Record<string, unknown>;
  }, [produitDetail]);

  const programme = detailRecord ? pickRecord(detailRecord.programme) : null;
  const annee = detailRecord ? pickRecord(detailRecord.annee) : null;

  const handleGenerateBon = useCallback(async () => {
    const payload = buildDocumentBonLaboratoirePayload({
      commande,
      commandeId: id,
      etudiant,
      produitDetail,
    });
    setGenerating(true);
    try {
      const result = await generateBonLaboratoirePdfAction(payload);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      downloadPdfFromBase64(result.pdfBase64, result.filename);
    } finally {
      setGenerating(false);
    }
  }, [commande, id, etudiant, produitDetail]);

  return (
    <div className="space-y-4">
      <PaiementMetierRessourceCore
        commande={commande}
        commandeId={id}
        variant="laboratoire"
        busy={busy}
        onRecheck={onRecheck}
      />

      <div
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-white to-primary/[0.06] p-4 shadow-sm dark:border-primary/25 dark:from-darklight dark:via-darklight dark:to-primary/10 sm:p-6"
        data-testid="paiement-metier-laboratoire-bon"
      >
        <div className="border-b border-primary/15 pb-3 dark:border-primary/20">
          <h3 className="text-lg font-bold text-midnight_text dark:text-white">Bon de laboratoire</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Récapitulatif de la commande et génération du document PDF transmis au service étudiant.
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200/90 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Produit &amp; ressource</h4>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300">
              <li>
                <strong className="text-midnight_text dark:text-white">Désignation :</strong>{" "}
                {String(detailRecord?.designation ?? "—")}
              </li>
              <li>
                <strong className="text-midnight_text dark:text-white">Montant :</strong>{" "}
                {String(detailRecord?.amount ?? commande.transaction?.amount ?? "—")}{" "}
                {String(detailRecord?.currency ?? commande.transaction?.currency ?? "")}
              </li>
              {annee ? (
                <li>
                  <strong className="text-midnight_text dark:text-white">Année :</strong>{" "}
                  <span className="font-mono text-xs">{String(annee.slug ?? annee.designation ?? "—")}</span>
                </li>
              ) : null}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-200/90 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Étudiant &amp; promotion</h4>
            {etudiant ? (
              <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                <li>
                  <strong className="text-midnight_text dark:text-white">Nom :</strong> {etudiant.name}
                </li>
                <li>
                  <strong className="text-midnight_text dark:text-white">Matricule :</strong> {etudiant.matricule}
                </li>
                <li>
                  <strong className="text-midnight_text dark:text-white">Cycle / diplôme :</strong> {etudiant.cycle} —{" "}
                  {etudiant.diplome || "—"}
                </li>
                {programme ? (
                  <li>
                    <strong className="text-midnight_text dark:text-white">Programme :</strong>{" "}
                    {String(programme.designation ?? programme.filiere ?? "—")}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-slate-600 dark:text-slate-400">Profil étudiant local non chargé.</p>
            )}
          </article>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleGenerateBon()}
            disabled={Boolean(busy) || generating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-darkprimary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon="solar:document-add-bold-duotone" className="text-lg" aria-hidden />
            {generating ? "Génération…" : "Générer le bon de laboratoire (PDF)"}
          </button>
        </div>
      </div>
    </div>
  );
}
