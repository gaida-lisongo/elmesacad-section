import type { ResolutionResumeFromPaidOrder } from "@/lib/commande/resolutionResumeTypes";

/** Commande telle que renvoyée par `getById` / `check` (résumé client). */
export type PaiementCommandeClientPayload = {
  id?: string;
  status?: string;
  student?: { email?: string; matricule?: string };
  ressource?: {
    reference?: string;
    produit?: string;
    categorie?: string;
    metadata?: Record<string, unknown>;
  };
  transaction?: {
    orderNumber?: string;
    amount?: number;
    currency?: string;
    phoneNumber?: string;
    microservice?: {
      orderId?: string;
      syncAttempted: boolean;
      success?: boolean;
      errorHint?: string;
    };
  };
};

export function buildResolutionResume(
  commandeId: string,
  payload: PaiementCommandeClientPayload
): ResolutionResumeFromPaidOrder | null {
  const email = String(payload.student?.email ?? "").trim();
  const matricule = String(payload.student?.matricule ?? "").trim();
  if (!email || !matricule) return null;
  return { commandeId, email, matricule };
}

/** Bloc section / branding (ressource service étudiant). */
export type PaiementSectionBranding = {
  institut: string;
  section: string;
  sectionRef: string;
  chef: string;
  contact: string;
  email: string;
  adresse: string;
};

export type PaiementActiviteHydration = {
  kind: "activite";
  id: string;
  categorie: "TP" | "QCM";
  noteMaximale: number;
  dateRemise: string;
  status: string;
};

export type PaiementRessourceHydration = {
  kind: "ressource";
  id: string;
  categorie: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  section: PaiementSectionBranding;
};

export type PaiementProduitHydration = PaiementActiviteHydration | PaiementRessourceHydration;

/** Étudiant local (MongoDB app), même matricule + email que la commande. */
export type PaiementEtudiantLocalView = {
  id: string;
  name: string;
  email: string;
  matricule: string;
  sexe: string;
  telephone: string;
  photo: string;
  diplome: string;
  cycle: string;
  status: string;
  ville: string;
  dateDeNaissance: string | null;
  nationalite: string;
  lieuDeNaissance: string;
  adresse: string;
};

/** Document brut service étudiant / titulaire (GET ressource ou activité) pour affichage riche avant routage métier. */
export type PaiementProduitDetailRecord = Record<string, unknown>;

/** Contexte SSR passé au client pour `/paiement`. */
export type PaiementPageHydration = {
  commande: PaiementCommandeClientPayload;
  etudiantLocal: PaiementEtudiantLocalView | null;
  produit: PaiementProduitHydration | null;
  /** Données complètes du produit (programme, annee, branding, description… ou tp/qcm…) quand disponibles. */
  produitDetail?: PaiementProduitDetailRecord | null;
  produitError?: string;
};

/** Détails étudiant local + produit (activité / ressource + section) pour la zone métier uniquement. */
export type PaiementMetierHydrationSlice = {
  etudiantLocal: PaiementEtudiantLocalView | null;
  produit: PaiementProduitHydration | null;
  produitDetail?: PaiementProduitDetailRecord | null;
  produitError?: string;
};
