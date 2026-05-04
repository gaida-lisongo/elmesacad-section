import type { PaiementSectionBranding } from "@/app/paiement/_components/commandeResumePayload";
import {
  buildPaiementRessourceBlockForDocument,
  type BuildDocumentBulletinContext,
} from "@/lib/paiement/documentBulletinPayload";
import {
  buildLaboratoirePaymentServiceLogContext,
  type LaboratoirePaymentServiceLogContext,
} from "@/lib/paiement/laboratoirePaymentLogContext";

export type DocumentBonLaboratoirePayload = Omit<LaboratoirePaymentServiceLogContext, "scope"> & {
  /** Même objet que `ressource.branding` (aligné bulletin / macaron). */
  branding: PaiementSectionBranding;
  ressource: {
    produit: string;
    categorie: string;
    reference: string;
    branding: PaiementSectionBranding;
  };
};

export function buildDocumentBonLaboratoirePayload(
  input: BuildDocumentBulletinContext
): DocumentBonLaboratoirePayload {
  const base = buildLaboratoirePaymentServiceLogContext(input);
  const ressource = buildPaiementRessourceBlockForDocument(input);
  return {
    commande: base.commande,
    produit: base.produit,
    promotion: base.promotion,
    etudiant: base.etudiant,
    branding: ressource.branding,
    ressource,
  };
}
