import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
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
};

export type BuildDocumentBulletinContext = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  etudiant: PaiementEtudiantLocalView | null;
};

function trimOrEmpty(v: string | undefined | null): string {
  return String(v ?? "").trim();
}

/**
 * Transforme le snapshot consolidé (`onGenerateDocument`) vers le format attendu par le moteur de document bulletin.
 */
export function buildDocumentBulletinPayload(
  consolidated: ConsolidatedResultDocumentPayload,
  ctx: BuildDocumentBulletinContext
): DocumentBulletinPayload {
  const { commande, commandeId, etudiant } = ctx;
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
      type: "fiche-validation",
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
  };
}
