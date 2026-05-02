import type { CommandeProduit } from "@/lib/constants/commandeProduit";
import { isCommandeProduit } from "@/lib/constants/commandeProduit";
import type { ProductPageModel } from "@/lib/product/loadProductPageData";

/** Clé `ressource.categorie` en base (unicité avec référence + étudiant). */
export function marketplaceLineCategorieFromModel(model: ProductPageModel): string {
  if (model.kind === "activity") {
    return model.urlCategory === "qcm" ? "QCM" : "TP";
  }
  const map: Record<string, string> = {
    sujet: "SUJET",
    stage: "STAGE",
    validation: "VALIDATION",
    releve: "RELEVE",
    labo: "LABO",
    session: "SESSION",
  };
  return map[model.apiCategorie] ?? String(model.apiCategorie).toUpperCase();
}

export function commandeProduitFromModel(model: ProductPageModel): CommandeProduit {
  if (model.kind === "activity") return "activite";
  if (model.apiCategorie === "validation") return "fiche-validation";
  if (model.apiCategorie === "labo") return "laboratoire";
  if (
    model.apiCategorie === "sujet" ||
    model.apiCategorie === "stage" ||
    model.apiCategorie === "releve" ||
    model.apiCategorie === "session"
  ) {
    return model.apiCategorie;
  }
  return "sujet";
}

export function marketplacePayAmount(model: ProductPageModel): number {
  const n = model.kind === "activity" ? model.montant : model.amount;
  const v = Number(n);
  return v > 0 ? v : 1;
}

export function marketplaceCurrency(model: ProductPageModel): "USD" | "CDF" {
  const c = (model.kind === "activity" ? model.currency : model.currency) ?? "USD";
  return String(c).toUpperCase() === "CDF" ? "CDF" : "USD";
}

export function marketplaceProductTitle(model: ProductPageModel): string {
  return model.kind === "activity" ? model.title : model.designation;
}
