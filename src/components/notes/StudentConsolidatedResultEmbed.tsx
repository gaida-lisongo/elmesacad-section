"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNotesMappingForConsolidation, fetchStructuredNotesByMatricules } from "@/actions/notesConsolidation";
import StudentConsolidatedResultPanel from "@/components/notes/StudentConsolidatedResultPanel";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import {
  extractConsolidationContextFromCommandeMetadata,
  extractConsolidationContextFromProduitRecord,
} from "@/lib/notes/extractConsolidationMetadata";
import type {
  ConsolidatedStudentProfile,
  ProgrammeMatiereContext,
  StructuredNotesEntry,
} from "@/lib/notes/consolidatedResultTypes";

type Props = {
  commande: PaiementCommandeClientPayload;
  /** Document ressource déjà hydraté côté serveur (`programme.filiere` = slug programme, `annee.slug`, `branding.sectionRef`). */
  produitDetail: PaiementProduitDetailRecord | null;
  /** Profil étudiant local (Mongo) déjà chargé en SSR. */
  etudiant: PaiementEtudiantLocalView | null;
};

function buildStudentProfile(
  etudiant: PaiementEtudiantLocalView | null,
  commande: PaiementCommandeClientPayload,
  metaRecord: Record<string, unknown> | undefined,
  anneeSlug: string | undefined
): ConsolidatedStudentProfile {
  const fullNameMeta = String(metaRecord?.fullName ?? "").trim();
  return {
    nomComplet: (etudiant?.name ?? "").trim() || fullNameMeta || undefined,
    matricule:
      (etudiant?.matricule ?? "").trim() || String(commande.student?.matricule ?? "").trim() || undefined,
    email:
      (etudiant?.email ?? "").trim() || String(commande.student?.email ?? "").trim() || undefined,
    sexe: (etudiant?.sexe ?? "").trim() || undefined,
    nationalite: (etudiant?.nationalite ?? "").trim() || undefined,
    anneeSlug: anneeSlug?.trim() || undefined,
  };
}

export default function StudentConsolidatedResultEmbed({ commande, produitDetail, etudiant }: Props) {
  const meta = commande.ressource?.metadata;
  const metaRecord =
    meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : undefined;

  const matricule = String(commande.student?.matricule ?? "").trim();

  const consolidationCtx = useMemo(() => {
    return (
      extractConsolidationContextFromProduitRecord(produitDetail) ??
      extractConsolidationContextFromCommandeMetadata(metaRecord)
    );
  }, [produitDetail, metaRecord]);

  console.log("consolidationCtx : ", consolidationCtx);

  const studentProfile = useMemo(
    () => buildStudentProfile(etudiant, commande, metaRecord, consolidationCtx?.anneeSlug),
    [etudiant, commande, metaRecord, consolidationCtx?.anneeSlug]
  );

  const [mappingRows, setMappingRows] = useState<ProgrammeMatiereContext[]>([]);
  const [programmeName, setProgrammeName] = useState("");
  const [programmeCredits, setProgrammeCredits] = useState(0);
  const [notes, setNotes] = useState<StructuredNotesEntry | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matricule || !consolidationCtx) {
      setMappingRows([]);
      setProgrammeName("");
      setProgrammeCredits(0);
      setNotes(undefined);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [mapRes, notesMap] = await Promise.all([
          fetchNotesMappingForConsolidation({
            sectionRef: consolidationCtx.sectionRef,
            programmeId: consolidationCtx.programmeId,
          }),
          fetchStructuredNotesByMatricules([matricule]),
        ]);

        console.log("mapRes", mapRes);
        console.log("notesMap", notesMap);
        console.log("matricule", matricule);
        console.log("Notes :", notesMap[matricule]);

        if (cancelled) return;
        if (!mapRes.ok) {
          setError(mapRes.message);
          setMappingRows([]);
          setProgrammeName("");
          setProgrammeCredits(0);
        } else {
          setMappingRows(mapRes.rows);
          setProgrammeName(mapRes.programmeName);
          setProgrammeCredits(mapRes.programmeCredits);
        }
        setNotes(notesMap[matricule]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur lors du chargement des notes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matricule, consolidationCtx?.sectionRef, consolidationCtx?.programmeId, consolidationCtx?.anneeSlug]);

  if (!matricule) {
    return (
      <div className="mb-6 mt-6 space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Matricule manquant pour charger les cotes.</p>
      </div>
    );
  }

  if (!consolidationCtx) {
    return (
      <div className="mb-6 mt-6 space-y-3">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Synthèse des notes : impossible de résoudre le programme (section ou filière). Les données produit
          doivent être présentes après hydratation serveur de la ressource.
        </p>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="mb-6 mt-6 space-y-3">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Synthèse des notes : {error}
        </p>
      </div>
    );
  }

  const matForPanel = studentProfile.matricule || matricule;

  const anneeLabel = consolidationCtx.anneeSlug ?? studentProfile.anneeSlug ?? "—";

  return (
    <div className="mb-6 mt-6 space-y-3">
      <StudentConsolidatedResultPanel
        title="Votre résultat consolidé"
        student={{
          nomComplet: studentProfile.nomComplet,
          matricule: matForPanel,
          email: studentProfile.email,
          sexe: studentProfile.sexe,
          nationalite: studentProfile.nationalite,
          anneeSlug: studentProfile.anneeSlug,
        }}
        notes={notes}
        notesLoading={loading}
        programmeCredits={programmeCredits}
        programmeName={programmeName}
        mappingRows={mappingRows}
        anneeLabel={anneeLabel}
      />
    </div>
  );
}
