"use server";

import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { ProgrammeModel } from "@/lib/models/Programme";
import "@/lib/models/Semestre";
import "@/lib/models/UniteEnseignement";
import "@/lib/models/Matiere";
import { buildNotesMappingRowsFromPopulatedProgramme } from "@/lib/notes/buildNotesMappingRows";
import type { ProgrammeMatiereContext, StructuredNotesEntry } from "@/lib/notes/consolidatedResultTypes";
import {
  commandeMetadataAugmentedFromEtudiantResource,
  extractConsolidationContextFromCommandeMetadata,
  type ConsolidationProgrammeContext,
} from "@/lib/notes/extractConsolidationMetadata";
import { CommandeModel } from "@/lib/models/Commande";
import { fetchStructuredNotesTitulaireForMatricules } from "@/lib/notes/fetchStructuredNotesTitulaire";
import { fetchEtudiantResourceById } from "@/lib/product/fetchEtudiantResourcePublic";

async function resolveSectionObjectId(sectionRef: string): Promise<Types.ObjectId | null> {
  const ref = sectionRef.trim();
  if (!ref) return null;
  await connectDB();
  if (Types.ObjectId.isValid(ref)) {
    const doc = await SectionModel.findById(ref).select("_id").lean();
    if (doc?._id) return doc._id as Types.ObjectId;
  }
  const bySlug = await SectionModel.findOne({ slug: ref }).select("_id").lean();
  return (bySlug?._id as Types.ObjectId) ?? null;
}

export type FetchNotesMappingResult =
  | {
      ok: true;
      rows: ProgrammeMatiereContext[];
      programmeName: string;
      programmeCredits: number;
    }
  | { ok: false; message: string };

async function loadNotesMappingFromDb(input: {
  sectionRef: string;
  programmeId: string;
}): Promise<FetchNotesMappingResult> {
  const sectionRef = String(input.sectionRef ?? "").trim();
  const programmeId = String(input.programmeId ?? "").trim();
  console.log("[loadNotesMappingFromDb] sectionRef : ", sectionRef);
  console.log("[loadNotesMappingFromDb] programmeId : ", programmeId);
  if (!sectionRef || !programmeId) {
    return { ok: false, message: "Section ou programme invalide." };
  }

  try {
    await connectDB();
    // const sid = await resolveSectionObjectId(sectionRef);
    const programme = await ProgrammeModel.findOne({ slug: programmeId})
      .select("_id designation slug credits semestres")
      .populate({
        path: "semestres",
        model: "Semestre",
        populate: {
          path: "unites",
          model: "UniteEnseignement",
          populate: {
            path: "matieres",
            model: "Matiere",
            select: "_id designation credits code",
          },
        },
      })
      .lean();

    console.log("[loadNotesMappingFromDb] programme : ", programme);

    if (!programme) {
      return { ok: false, message: "Programme introuvable pour cette section." };
    }

    const prog = programme as Record<string, unknown>;
    const rows = buildNotesMappingRowsFromPopulatedProgramme(prog);
    return {
      ok: true,
      rows,
      programmeName: String((programme as { designation?: unknown }).designation ?? "").trim() || "—",
      programmeCredits: Number((programme as { credits?: unknown }).credits ?? 0),
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur de chargement du programme.",
    };
  }
}

async function resolveConsolidationContextWithResourceFallback(
  meta: Record<string, unknown> | undefined,
  resourceReference: string | undefined
): Promise<{ ok: true; ctx: any } | { ok: false; message: string }> {

  const ref = String(resourceReference ?? "").trim();
  
  if (!ref) {
    // console.log("[resolveConsolidationContextWithResourceFallback] ref is not defined");
    return {
      ok: false,
      message:
        "Informations section/programme manquantes sur la commande et référence ressource absente. Contactez le support.",
    };
  }

  const raw = await fetchEtudiantResourceById(ref);
  if (!raw) {
    // console.log("[resolveConsolidationContextWithResourceFallback] raw is not defined");
    return {
      ok: false,
      message:
        "Ressource marketplace introuvable pour cette commande. Vérifiez le service étudiant (ETUDIANT_SERVICE) ou réessayez plus tard.",
    };
  }

  const merged = commandeMetadataAugmentedFromEtudiantResource(meta, raw);
  const anneeFromResource = String((raw as { annee?: { slug?: unknown } }).annee?.slug ?? "").trim() || undefined;
  const ctx = {...extractConsolidationContextFromCommandeMetadata(merged), anneeSlug: anneeFromResource};

  if (!ctx) {
    // console.log("[resolveConsolidationContextWithResourceFallback] ctx is not defined");
    return {
      ok: false,
      message: "Informations section/programme manquantes sur la ressource. Contactez le support.",
    };
  }
  
  return {
    ok: true,
    ctx: {
      ...ctx,
      anneeSlug: anneeFromResource,
      merged,
      raw,
      ref,
    },
  };
}

/** Contexte renvoyé par `fetchConsolidationContextFromCommandeResource` en cas de succès (pas de champ `ok`). */
export type ConsolidationContextFromCommandeResource = ConsolidationProgrammeContext & {
  merged: Record<string, unknown>;
  raw: Record<string, unknown>;
  ref: string;
};

/** Côté client : complète le contexte consolidation via `GET` ressource service étudiant si les métadonnées commande sont incomplètes. */
export async function fetchConsolidationContextFromCommandeResource(
  resourceReference: string,
  commandeMetadata?: Record<string, unknown>
): Promise<ConsolidationContextFromCommandeResource | { ok: false; message: string }> {
  const data = await resolveConsolidationContextWithResourceFallback(commandeMetadata, resourceReference);
  if (!data.ok) {
    return { ok: false, message: data.message };
  }
  return data.ctx as ConsolidationContextFromCommandeResource;
}

export type FetchEtudiantResourceRecordResult =
  | { ok: true; record: Record<string, unknown> }
  | { ok: false; message: string };

/**
 * À appeler depuis un composant client (ex. `PaiementMetierResultatWithConsolidation`) :
 * lecture `GET /resources/:id` côté serveur — ne pas importer `fetchEtudiantResourcePublic` dans le client
 * (chaîne `upstreamFetch` → `next/headers`).
 */
export async function fetchEtudiantResourceRecordForClient(
  resourceId: string
): Promise<FetchEtudiantResourceRecordResult> {
  const ref = String(resourceId ?? "").trim();
  if (!ref) {
    return { ok: false, message: "Référence ressource manquante." };
  }
  const raw = await fetchEtudiantResourceById(ref);
  if (!raw) {
    return { ok: false, message: "Ressource introuvable sur le service étudiant." };
  }
  try {
    const record = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    return { ok: true, record };
  } catch {
    return { ok: false, message: "Réponse ressource non sérialisable." };
  }
}

/**
 * Résout `sectionRef` (slug ou `_id`) + `programmeId` — lecture BDD uniquement (pas de vérif session).
 */
export async function fetchNotesMappingForConsolidation(input: {
  sectionRef: string;
  programmeId: string;
}): Promise<FetchNotesMappingResult> {
  return loadNotesMappingFromDb(input);
}

/** Notes structurées via le service titulaire — sans contrôle de session côté Next. */
export async function fetchStructuredNotesByMatricules(matricules: string[]) {
  return fetchStructuredNotesTitulaireForMatricules(matricules);
}

export type PaidCommandeConsolidationResult =
  | {
      ok: true;
      studentProfile: {
        nomComplet?: string;
        matricule: string;
        email: string;
        anneeSlug?: string;
      };
      mapping: Extract<FetchNotesMappingResult, { ok: true }>;
      notes: StructuredNotesEntry | undefined;
    }
  | { ok: false; message: string };

/**
 * Après paiement confirmé d'une fiche de validation ou d'un relevé : charge mapping + notes
 * à partir de la commande (sans exiger une session étudiant : l’acc repose sur l’id de commande
 * + statut payé / produit autorisé ; microservices titulaire supposés accessibles).
 */
export async function loadConsolidationForPaidFicheOrReleveCommande(
  commandeId: string,
  programmeId: string
): Promise<PaidCommandeConsolidationResult> {
  const id = String(commandeId ?? "").trim();
  if (!Types.ObjectId.isValid(id)) {
    return { ok: false, message: "Commande invalide." };
  }

  await connectDB();
  const cmd = await CommandeModel.findById(id).lean();
  if (!cmd) {
    return { ok: false, message: "Commande introuvable." };
  }

  const ownMatricule = String(cmd.student?.matricule ?? "").trim();
  if (!ownMatricule) {
    return { ok: false, message: "Matricule manquant sur la commande." };
  }

  const produit = cmd.ressource?.produit;
  if (produit !== "fiche-validation" && produit !== "releve") {
    return {
      ok: false,
      message: "La synthèse des cotes suit un achat de fiche de validation ou de relevé de cotes.",
    };
  }

  if (cmd.status !== "paid" && cmd.status !== "completed") {
    return { ok: false, message: "Le paiement doit être confirmé pour afficher vos cotes." };
  }

  const meta =
    cmd.ressource?.metadata != null && typeof cmd.ressource.metadata === "object" && !Array.isArray(cmd.ressource.metadata)
      ? (cmd.ressource.metadata as Record<string, unknown>)
      : undefined;

  const resolved = await resolveConsolidationContextWithResourceFallback(meta, cmd.ressource?.reference);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message };
  }
  const ctx = resolved.ctx;
  // console.log("[loadConsolidationForPaidFicheOrReleveCommande] ctx : ", ctx);

  const fullName = String(meta?.fullName ?? "").trim();

  const programmeIdForMapping =
    String(programmeId ?? "").trim() || String(ctx.programmeId ?? "").trim();
  if (!programmeIdForMapping) {
    return { ok: false, message: "Programme introuvable pour cette commande." };
  }

  try {
    const [mapRes, notesMap] = await Promise.all([
      loadNotesMappingFromDb({ sectionRef: ctx.sectionRef, programmeId: programmeIdForMapping }),
      fetchStructuredNotesTitulaireForMatricules([ownMatricule]),
    ]);
    // console.log("[loadConsolidationForPaidFicheOrReleveCommande] mapRes : ", mapRes);
    // console.log("[loadConsolidationForPaidFicheOrReleveCommande] notesMap : ", notesMap);
    if (!mapRes.ok) {
      return { ok: false, message: mapRes.message };
    }
    return {
      ok: true,
      studentProfile: {
        nomComplet: fullName || undefined,
        matricule: ownMatricule,
        email: String(cmd.student?.email ?? "").trim(),
        anneeSlug: ctx.anneeSlug,
      },
      mapping: mapRes,
      notes: notesMap[ownMatricule],
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur lors du chargement des notes.",
    };
  }
}
