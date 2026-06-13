"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import Image from "next/image";
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

  const rawAnnee = detailRecord ? pickRecord(detailRecord.annee) : null;
  const anneeSlug = rawAnnee ? String(rawAnnee.slug ?? "") : "";
  const anneeDebut = rawAnnee ? String(rawAnnee.debut ?? "") : "";
  const anneeFin = rawAnnee ? String(rawAnnee.fin ?? "") : "";

  const amount = Number(detailRecord?.amount ?? commande.transaction?.amount ?? 0);
  const currency = String(detailRecord?.currency ?? commande.transaction?.currency ?? "");
  const designation = String(detailRecord?.designation ?? "Session d'examen");
  const orderNumber = commande.transaction?.orderNumber;

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
        className="grid min-h-[520px] grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-darklight lg:grid-cols-3"
        data-testid="paiement-metier-session-enrollement"
      >
        {/* Colonne A — Produit + image */}
        <div className="relative flex flex-col justify-between p-6 lg:col-span-1 lg:p-8">
          {/* Image de fond */}
          <div className="absolute inset-0">
            <Image
              src="/images/inbtp/img-14.jpg"
              alt="INBTP"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40" />
          </div>

          {/* Contenu */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white/80 backdrop-blur-sm">
              <Icon icon="solar:calendar-date-bold-duotone" className="h-3.5 w-3.5" />
              Enrôlement
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white lg:text-3xl">{designation}</h2>

            <div className="mt-6 space-y-3 text-sm text-white/80">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span>Montant</span>
                <span className="font-bold text-white">
                  {amount.toLocaleString("fr-FR")} {currency}
                </span>
              </div>
              {anneeSlug && (
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span>Année</span>
                  <span className="font-medium text-white">{anneeSlug}</span>
                </div>
              )}
              {(anneeDebut || anneeFin) && (
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span>Période</span>
                  <span className="font-medium text-white">
                    {anneeDebut || "—"} — {anneeFin || "—"}
                  </span>
                </div>
              )}
              {orderNumber && (
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span>N° ordre</span>
                  <span className="font-mono text-xs text-white">{orderNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <button
              type="button"
              onClick={() => void handleGenerateMacaron()}
              disabled={Boolean(busy) || generating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon icon={generating ? "solar:spinner-bold-duotone" : "solar:document-add-bold-duotone"} className={`text-lg ${generating ? "animate-spin" : ""}`} />
              {generating ? "Génération…" : "Générer le macaron"}
            </button>
            <p className="mt-3 text-center text-[10px] text-white/50">
              Le PDF sera téléchargé automatiquement.
            </p>
          </div>
        </div>

        {/* Colonne B — Étudiant + cours */}
        <div className="flex flex-col gap-6 bg-slate-50 p-6 dark:bg-slate-900/40 lg:col-span-2 lg:p-8">
          {/* Étudiant */}
          <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Icon icon="solar:user-id-bold-duotone" className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Informations de l&apos;étudiant
              </h3>
            </div>

            {etudiant ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Nom complet</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{etudiant.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Matricule</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{etudiant.matricule}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{etudiant.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Cycle / Diplôme</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {etudiant.cycle || "—"} {etudiant.diplome ? `· ${etudiant.diplome}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Profil étudiant non chargé.</p>
            )}
          </section>

          {/* Cours */}
          <section className="flex-1 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Icon icon="solar:notebook-bold-duotone" className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Cours concernés ({cours.length})
              </h3>
            </div>

            {cours.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune matière listée pour cette session.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {cours.map((c) => (
                  <li
                    key={c.reference}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-primary/20 hover:bg-primary/[0.03] dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm dark:bg-slate-800">
                      <Icon icon="solar:check-circle-bold-duotone" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {c.designation || "—"}
                      </p>
                      {c.credit > 0 && (
                        <p className="text-[10px] text-slate-400">{c.credit} crédit{c.credit > 1 ? "s" : ""}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
