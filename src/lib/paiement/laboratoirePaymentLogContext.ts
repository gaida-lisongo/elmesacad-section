import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";

function pickRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function trimStr(v: unknown): string {
  return String(v ?? "").trim();
}

export type LaboratoirePaymentServiceLogContext = {
  scope: "laboratoire-service-payload-draft";
  commande: {
    id: string;
    status: string;
    ressource: unknown;
    transaction: unknown;
    metadataCommande: Record<string, unknown>;
  };
  /** Détails produit / ressource service étudiant (bons labo, etc.). */
  produit: Record<string, unknown>;
  promotion: {
    programmeDesignation: string;
    programmeFiliereSlug: string;
    studentCycle: string;
    studentDiplome: string;
    studentName: string;
  };
  etudiant: Record<string, unknown> | null;
};

function laboratoireProduitDetailSlice(detail: Record<string, unknown> | null): Record<string, unknown> {
  if (!detail) return {};
  const keys = [
    "_id",
    "id",
    "designation",
    "description",
    "amount",
    "currency",
    "categorie",
    "status",
    "reference",
    "slug",
    "programme",
    "annee",
    "section",
    "matieres",
    "metadata",
    "laboratoire",
    "labo",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (detail[k] !== undefined) out[k] = detail[k];
  }
  return out;
}

/**
 * Agrège commande, produit (détail API), promotion (programme / filière / cycle) et étudiant
 * pour journalisation avant envoi futur au microservice laboratoire.
 */
export function buildLaboratoirePaymentServiceLogContext(input: {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  etudiant: PaiementEtudiantLocalView | null;
  produitDetail: PaiementProduitDetailRecord | null;
}): LaboratoirePaymentServiceLogContext {
  const { commande, commandeId, etudiant, produitDetail } = input;
  const d =
    produitDetail && typeof produitDetail === "object" && !Array.isArray(produitDetail)
      ? (produitDetail as Record<string, unknown>)
      : null;
  const prog = d ? pickRecord(d.programme) : null;
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
        lieuDeNaissance: etudiant.lieuDeNaissance,
        dateDeNaissance: etudiant.dateDeNaissance,
        adresse: etudiant.adresse,
        status: etudiant.status,
      }
    : null;

  return {
    scope: "laboratoire-service-payload-draft",
    commande: {
      id: trimStr(commandeId) || trimStr(commande.id) || "—",
      status: trimStr(commande.status) || "—",
      ressource: commande.ressource ?? null,
      transaction: commande.transaction ?? null,
      metadataCommande: meta,
    },
    produit: laboratoireProduitDetailSlice(d),
    promotion: {
      programmeDesignation,
      programmeFiliereSlug,
      studentCycle: trimStr(etudiant?.cycle) || "—",
      studentDiplome: trimStr(etudiant?.diplome) || "—",
      studentName,
    },
    etudiant: etudiantLog,
  };
}
