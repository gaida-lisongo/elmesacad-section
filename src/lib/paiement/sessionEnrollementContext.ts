import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
  PaiementSectionBranding,
} from "@/app/paiement/_components/commandeResumePayload";
import {
  buildPaiementRessourceBlockForDocument,
  type BuildDocumentBulletinContext,
} from "@/lib/paiement/documentBulletinPayload";

export type EnrollementCourseRow = {
  reference: string;
  designation: string;
  credit: number;
};

function pickRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function trimStr(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Matières rattachées à la ressource session (service étudiant / hydratation produit).
 */
export function extractSessionMatieresFromProduitDetail(
  produitDetail: PaiementProduitDetailRecord | null
): EnrollementCourseRow[] {
  const raw =
    produitDetail && typeof produitDetail === "object" && !Array.isArray(produitDetail)
      ? (produitDetail as Record<string, unknown>)
      : null;
  if (!raw) return [];
  const matieres = Array.isArray(raw.matieres) ? raw.matieres : [];
  const out: EnrollementCourseRow[] = [];
  for (const m of matieres) {
    const o = pickRecord(m);
    if (!o) continue;
    const reference = trimStr(o.reference);
    if (!reference) continue;
    const designation = trimStr(o.designation);
    const cred = o.credit ?? o.credits;
    let credit = 0;
    if (typeof cred === "number" && Number.isFinite(cred)) credit = cred;
    else if (cred != null && cred !== "") {
      const n = Number(cred);
      if (Number.isFinite(n)) credit = n;
    }
    out.push({ reference, designation, credit });
  }
  return out;
}

export type EnrollementDocumentLogContext = {
  produit: Record<string, unknown>;
  commande: {
    id: string;
    status: string;
    ressource: unknown;
    transaction: unknown;
    metadataCommande: Record<string, unknown>;
  };
  annee: Record<string, unknown>;
  promotion: {
    programmeDesignation: string;
    programmeFiliereSlug: string;
    studentCycle: string;
    studentDiplome: string;
    studentName: string;
  };
  etudiant: Record<string, unknown> | null;
  cours: EnrollementCourseRow[];
};

function produitLogSlice(detail: Record<string, unknown> | null): Record<string, unknown> {
  if (!detail) return {};
  const keys = ["designation", "amount", "currency", "categorie", "status", "_id", "id"] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (detail[k] !== undefined) out[k] = detail[k];
  }
  return out;
}

/**
 * Contexte à journaliser avant construction du payload PDF d’enrôlement (session).
 */
export function buildEnrollementDocumentLogContext(input: {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  etudiant: PaiementEtudiantLocalView | null;
  produitDetail: PaiementProduitDetailRecord | null;
}): EnrollementDocumentLogContext {
  const { commande, commandeId, etudiant, produitDetail } = input;
  const d =
    produitDetail && typeof produitDetail === "object" && !Array.isArray(produitDetail)
      ? (produitDetail as Record<string, unknown>)
      : null;
  const prog = d ? pickRecord(d.programme) : null;
  const annee = d ? pickRecord(d.annee) : null;
  const meta =
    commande.ressource?.metadata &&
    typeof commande.ressource.metadata === "object" &&
    !Array.isArray(commande.ressource.metadata)
      ? (commande.ressource.metadata as Record<string, unknown>)
      : {};
  const metaProg = pickRecord(meta.programme);
  const programmeDesignation =
    trimStr(prog?.designation) || trimStr(meta.productTitle) || trimStr(d?.designation) || "—";
  const programmeFiliereSlug =
    trimStr(prog?.filiere) || trimStr(metaProg?.filiere) || trimStr(meta.programmeFiliere) || "—";
  const studentName = trimStr(etudiant?.name) || trimStr(meta.fullName) || "—";

  const etudiantLog = etudiant
    ? {
        id: etudiant.id,
        name: etudiant.name,
        matricule: etudiant.matricule,
        email: etudiant.email,
        telephone: etudiant.telephone,
        ville: etudiant.ville,
        cycle: etudiant.cycle,
        diplome: etudiant.diplome,
        nationalite: etudiant.nationalite,
      }
    : null;

  return {
    produit: produitLogSlice(d),
    commande: {
      id: trimStr(commandeId) || trimStr(commande.id) || "—",
      status: trimStr(commande.status) || "—",
      ressource: commande.ressource ?? null,
      transaction: commande.transaction ?? null,
      metadataCommande: meta,
    },
    annee: annee ?? {},
    promotion: {
      programmeDesignation,
      programmeFiliereSlug,
      studentCycle: trimStr(etudiant?.cycle) || "—",
      studentDiplome: trimStr(etudiant?.diplome) || "—",
      studentName,
    },
    etudiant: etudiantLog,
    cours: extractSessionMatieresFromProduitDetail(produitDetail),
  };
}

/** Payload envoyé à `POST /macaron/generate` (macaron session / enrôlement). */
export type DocumentMacaronPayload = EnrollementDocumentLogContext & {
  /** Même objet que `ressource.branding` (pratique côté service si le schéma lit la racine). */
  branding: PaiementSectionBranding;
  /** Bloc aligné sur le bulletin : `ressource.branding` + libellés produit pour le microservice. */
  ressource: {
    produit: string;
    categorie: string;
    reference: string;
    branding: PaiementSectionBranding;
  };
};

export function buildDocumentMacaronPayload(input: {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  etudiant: PaiementEtudiantLocalView | null;
  produitDetail: PaiementProduitDetailRecord | null;
}): DocumentMacaronPayload {
  const base = buildEnrollementDocumentLogContext(input);
  const ctxBranding: BuildDocumentBulletinContext = {
    commande: input.commande,
    commandeId: input.commandeId,
    etudiant: input.etudiant,
    produitDetail: input.produitDetail,
  };
  const ressource = buildPaiementRessourceBlockForDocument(ctxBranding);
  return {
    ...base,
    branding: ressource.branding,
    ressource,
  };
}
