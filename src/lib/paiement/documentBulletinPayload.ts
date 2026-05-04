import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
  PaiementSectionBranding,
} from "@/app/paiement/_components/commandeResumePayload";
import type { ConsolidatedResultDocumentPayload } from "@/lib/notes/consolidatedResultTypes";

export interface Note {
  code: string;
  unite: string;
  credit: number;
  moyenne: number;
  elements: {
    designation: string;
    cc: number;
    examen: number;
    rattrage: number;
    credit: number;
  }[];
}

export type DocumentBulletinPayload = {
  notes: Note[];
  student?: {
    profile?: string;
    nom: string;
    sexe: string;
    ville: string;
  };
  parcour?: {
    promotion: string;
    systeme: string;
    matricule: string;
    annee: string;
  };
  contact?: {
    email: string;
    telephone: string;
    adresse: string;
  };
  document?: {
    type: string;
    ressource: string;
    detail: string;
    reference: string;
    dateCreate: string;
    other?: string;
  };
  /** Détails ressource marketplace / service étudiant (document hydraté + branding section). */
  ressource?: {
    produit?: string;
    categorie?: string;
    reference?: string;
    branding?: PaiementSectionBranding;
  };
};

export type BuildDocumentBulletinContext = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  etudiant: PaiementEtudiantLocalView | null;
  /** Document produit SSR (contient souvent `branding`, `programme`, `annee`). */
  produitDetail: PaiementProduitDetailRecord | null;
};

function trimOrEmpty(v: string | undefined | null): string {
  return String(v ?? "").trim();
}

function pickRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function emptyBranding(): PaiementSectionBranding {
  return {
    institut: "",
    section: "",
    sectionRef: "",
    chef: "",
    contact: "",
    email: "",
    adresse: "",
  };
}

/** Normalise le bloc `branding` du document ressource (même contrat que l’hydratation paiement). */
export function brandingFromResourceRecord(raw: Record<string, unknown> | null | undefined): PaiementSectionBranding {
  const b = pickRecord(raw?.branding);
  if (!b) return emptyBranding();
  return {
    institut: String(b.institut ?? "").trim(),
    section: String(b.section ?? "").trim(),
    sectionRef: String(b.sectionRef ?? "").trim(),
    chef: String(b.chef ?? "").trim(),
    contact: String(b.contact ?? "").trim(),
    email: String(b.email ?? "").trim(),
    adresse: String(b.adresse ?? "").trim(),
  };
}

function mergeBranding(primary: PaiementSectionBranding, fallback: PaiementSectionBranding): PaiementSectionBranding {
  const pick = (a: string, b: string) => (trimOrEmpty(a) ? a : b);
  return {
    institut: pick(primary.institut, fallback.institut),
    section: pick(primary.section, fallback.section),
    sectionRef: pick(primary.sectionRef, fallback.sectionRef),
    chef: pick(primary.chef, fallback.chef),
    contact: pick(primary.contact, fallback.contact),
    email: pick(primary.email, fallback.email),
    adresse: pick(primary.adresse, fallback.adresse),
  };
}

/** Branding section fusionné (produit SSR + métadonnées commande). */
export function mergePaiementBrandingFromContext(ctx: BuildDocumentBulletinContext): PaiementSectionBranding {
  const { commande, produitDetail } = ctx;
  const detailRecord =
    produitDetail && typeof produitDetail === "object" && !Array.isArray(produitDetail)
      ? (produitDetail as Record<string, unknown>)
      : null;
  const metaRecord =
    commande.ressource?.metadata &&
    typeof commande.ressource.metadata === "object" &&
    !Array.isArray(commande.ressource.metadata)
      ? (commande.ressource.metadata as Record<string, unknown>)
      : null;
  const brandingFromDetail = detailRecord ? brandingFromResourceRecord(detailRecord) : emptyBranding();
  const brandingFromCommande = metaRecord ? brandingFromResourceRecord(metaRecord) : emptyBranding();
  return mergeBranding(brandingFromDetail, brandingFromCommande);
}

/** Bloc `ressource` (produit / catégorie / référence + branding) pour les PDF marketplace (bulletin, macaron, …). */
export function buildPaiementRessourceBlockForDocument(ctx: BuildDocumentBulletinContext): {
  produit: string;
  categorie: string;
  reference: string;
  branding: PaiementSectionBranding;
} {
  const { commande } = ctx;
  const detailRecord =
    ctx.produitDetail && typeof ctx.produitDetail === "object" && !Array.isArray(ctx.produitDetail)
      ? (ctx.produitDetail as Record<string, unknown>)
      : null;
  const metaRecord =
    commande.ressource?.metadata &&
    typeof commande.ressource.metadata === "object" &&
    !Array.isArray(commande.ressource.metadata)
      ? (commande.ressource.metadata as Record<string, unknown>)
      : null;
  const branding = mergePaiementBrandingFromContext(ctx);
  const resProduit =
    trimOrEmpty(detailRecord?.designation as string | undefined) ||
    trimOrEmpty(commande.ressource?.produit) ||
    "—";
  const resCategorie =
    trimOrEmpty(detailRecord?.categorie as string | undefined) || trimOrEmpty(commande.ressource?.categorie) || "—";
  const resReference =
    trimOrEmpty(detailRecord?.reference as string | undefined) ||
    trimOrEmpty(commande.ressource?.reference) ||
    trimOrEmpty(metaRecord?.reference as string | undefined) ||
    "—";
  return {
    produit: resProduit,
    categorie: resCategorie,
    reference: resReference,
    branding,
  };
}

/**
 * Transforme le snapshot consolidé (`onGenerateDocument`) vers le format attendu par le moteur de document bulletin.
 */
export function buildDocumentBulletinPayload(
  consolidated: ConsolidatedResultDocumentPayload,
  ctx: BuildDocumentBulletinContext
): DocumentBulletinPayload {
  const { commande, commandeId, etudiant, produitDetail } = ctx;
  const s = consolidated.student;

  const notes: Note[] = [];
  for (const sem of consolidated.semestres) {
    for (const u of sem.unites) {
      notes.push({
        code: u.code,
        unite: u.designation,
        credit: u.credit,
        moyenne: u.moyenne,
        elements: u.matieres.map((m) => ({
          designation: m.designation,
          cc: m.cc,
          examen: m.examen,
          rattrage: m.rattrapage,
          credit: m.credit,
        })),
      });
    }
  }

  const nom = trimOrEmpty(consolidated.nomAffiche) || trimOrEmpty(s?.nomComplet) || "—";
  const sexe = trimOrEmpty(s?.sexe) || trimOrEmpty(etudiant?.sexe) || "—";
  const ville = trimOrEmpty(etudiant?.ville) || "—";
  const profile = trimOrEmpty(etudiant?.photo) || undefined;

  const email =
    trimOrEmpty(s?.email) || trimOrEmpty(etudiant?.email) || trimOrEmpty(commande.student?.email) || "—";
  const telephone = trimOrEmpty(etudiant?.telephone) || "—";
  const adresse = trimOrEmpty(etudiant?.adresse) || "—";

  const ref = trimOrEmpty(commandeId) || trimOrEmpty(commande.id) || "—";
  const ressource = trimOrEmpty(commande.ressource?.produit) || "—";
  const detail = trimOrEmpty(commande.ressource?.categorie) || trimOrEmpty(commande.ressource?.reference) || "—";

  const ressourceBlock = buildPaiementRessourceBlockForDocument(ctx);

  return {
    notes,
    student: {
      ...(profile ? { profile } : {}),
      nom,
      sexe,
      ville,
    },
    parcour: {
      promotion: trimOrEmpty(consolidated.programmeName) || "—",
      systeme: trimOrEmpty(etudiant?.cycle) || trimOrEmpty(etudiant?.diplome) || "—",
      matricule: trimOrEmpty(s?.matricule) || trimOrEmpty(etudiant?.matricule) || "—",
      annee: trimOrEmpty(consolidated.anneeLabel) || trimOrEmpty(s?.anneeSlug) || "—",
    },
    contact: {
      email,
      telephone,
      adresse,
    },
    document: {
      type: "FICHE DE VALIDATION",
      ressource,
      detail,
      reference: ref,
      dateCreate: new Date().toISOString(),
      other: JSON.stringify({
        title: consolidated.title,
        synthese: consolidated.synthese,
        programmeCredits: consolidated.programmeCredits,
      }),
    },
    ressource: ressourceBlock,
  };
}
