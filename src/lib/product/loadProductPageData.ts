import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";
import { fetchActivitePublic } from "@/lib/product/fetchActivitePublic";
import { fetchEtudiantResourceById } from "@/lib/product/fetchEtudiantResourcePublic";
import {
  etudiantResourceApiCategorieFromUrl,
  humanizeProductCategory,
  isActivityProductCategory,
  normalizeProductCategorySegment,
  type EtudiantResourceApiCategorie,
} from "@/lib/product/productRoute";

export type DescriptionSectionVM = {
  title: string;
  contenu: string[];
};

export type ActivityProductVM = {
  kind: "activity";
  id: string;
  urlCategory: "qcm" | "tp";
  title: string;
  summary: string;
  montant: number;
  currency: "USD" | "CDF";
  noteMaximale: number;
  dateRemise: string;
  status: string;
  qcmCount: number;
  tpCount: number;
  matiereLabel: string;
  uniteLabel: string;
  promotionLabel: string;
  teacherLabel: string;
  chargeHoraireId: string;
  highlights: string[];
};

export type ResourceProductVM = {
  kind: "resource";
  id: string;
  apiCategorie: EtudiantResourceApiCategorie;
  urlCategorySlug: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  matiereReference: string;
  matiereCredit: number;
  lecteursLabel: string;
  sectionRefLabel: string;
  /** Identifiant programme Mongo (`programme.filiere` côté service étudiant), pour consolidation des notes. */
  programmeFiliereId?: string;
  descriptionSections: DescriptionSectionVM[];
  highlights: string[];
};

export type ProductPageModel = ActivityProductVM | ResourceProductVM;

export type ProductPageResult =
  | { ok: true; model: ProductPageModel; categoryLabel: string }
  | { ok: false; message: string };

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseDescriptionSections(raw: unknown): DescriptionSectionVM[] {
  const blocks = Array.isArray(raw) ? raw : [];
  return blocks.map((block) => {
    const b = block && typeof block === "object" ? (block as Record<string, unknown>) : {};
    const contenu = Array.isArray(b.contenu)
      ? b.contenu.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    return {
      title: String(b.title ?? "").trim() || "Section",
      contenu: contenu.length > 0 ? contenu : ["—"],
    };
  });
}

function mapActivityToVM(
  raw: Record<string, unknown>,
  urlCategory: "qcm" | "tp"
): ActivityProductVM | null {
  const id = String(raw._id ?? raw.id ?? "").trim();
  if (!id) return null;
  const charge = pickObject(raw.charge_horaire);
  const matiereObj = pickObject(charge?.matiere);
  const uniteObj = pickObject(charge?.unite);
  const promotionObj = pickObject(charge?.promotion);
  const titulaireObj = pickObject(charge?.titulaire);
  const tp = Array.isArray(raw.tp) ? raw.tp : [];
  const qcm = Array.isArray(raw.qcm) ? raw.qcm : [];
  const firstTp = pickObject(tp[0]);
  const firstQcm = pickObject(qcm[0]);
  const titleFromContent =
    String(firstTp?.enonce ?? firstQcm?.enonce ?? "").trim() ||
    `${humanizeProductCategory(urlCategory)} — ${id.slice(-8)}`;
  const matiereLabel = String(matiereObj?.designation ?? "Matière").trim();
  const uniteLabel = String(uniteObj?.designation ?? "Unité").trim();
  const promotionLabel = String(promotionObj?.designation ?? "Promotion").trim();
  const teacherLabel = String(titulaireObj?.name ?? "Enseignant").trim();
  const chargeHoraireId = String(charge?._id ?? charge?.id ?? "").trim();
  const montant = Number(raw.montant ?? 0);
  const currencyRaw = String(raw.currency ?? "USD").toUpperCase();
  const currency: "USD" | "CDF" = currencyRaw === "CDF" ? "CDF" : "USD";
  const noteMaximale = Number(raw.note_maximale ?? 0);
  const dateRemise = String(raw.date_remise ?? raw.dateRemise ?? "").trim();
  const highlights = [
    `${qcm.length} question(s) QCM`,
    `${tp.length} livrable(s) TP`,
    noteMaximale > 0 ? `Note maximale : ${noteMaximale}` : null,
    dateRemise ? `Date limite : ${dateRemise}` : null,
  ].filter((x): x is string => Boolean(x));

  return {
    kind: "activity",
    id,
    urlCategory,
    title: titleFromContent,
    summary: `${humanizeProductCategory(urlCategory)} publié par ${teacherLabel} — ${uniteLabel}`,
    montant,
    currency,
    noteMaximale,
    dateRemise,
    status: String(raw.status ?? "—").trim(),
    qcmCount: qcm.length,
    tpCount: tp.length,
    matiereLabel,
    uniteLabel,
    promotionLabel,
    teacherLabel,
    chargeHoraireId,
    highlights,
  };
}

/** Expose pour pré-visualisation marketplace (ex. liste section Études) sans refetch par id. */
export function mapResourceRecordToProductVM(
  raw: Record<string, unknown>,
  apiC: EtudiantResourceApiCategorie,
  urlSlug: string
): ResourceProductVM | null {
  return mapResourceToVM(raw, apiC, urlSlug);
}

function mapResourceToVM(
  raw: Record<string, unknown>,
  apiC: EtudiantResourceApiCategorie,
  urlSlug: string
): ResourceProductVM | null {
  const id = String(raw._id ?? raw.id ?? "").trim();
  if (!id) return null;
  const matiere = pickObject(raw.matiere);
  const lecteurs = Array.isArray(raw.lecteurs) ? raw.lecteurs : [];
  const lecteursLabel = lecteurs
    .map((l) => {
      const o = l && typeof l === "object" ? (l as Record<string, unknown>) : {};
      return String(o.nom ?? "").trim();
    })
    .filter(Boolean)
    .join(", ");
  const branding = pickObject(raw.branding);
  const programme = pickObject(raw.programme);
  const programmeFiliereRaw = String(programme?.filiere ?? "").trim();
  const programmeFiliereId = programmeFiliereRaw || undefined;
  const creditVal = matiere?.credit ?? matiere?.credits;
  let matiereCredit = 0;
  if (typeof creditVal === "number" && Number.isFinite(creditVal)) matiereCredit = Math.max(0, creditVal);
  else if (creditVal != null && creditVal !== "") {
    const n = Number(creditVal);
    if (Number.isFinite(n)) matiereCredit = Math.max(0, n);
  }
  const designation = String(raw.designation ?? "").trim() || "Ressource";
  const amount = Number(raw.amount ?? 0);
  const currency = String(raw.currency ?? "USD").trim() || "USD";
  const status = String(raw.status ?? "").trim();
  const matiereReference = String(matiere?.reference ?? "").trim();
  const sectionRefLabel = String(branding?.sectionRef ?? "").trim();
  const descriptionSectionsRaw = parseDescriptionSections(raw.description);
  const descriptionSections =
    descriptionSectionsRaw.length > 0
      ? descriptionSectionsRaw
      : [
          {
            title: "Description",
            contenu: ["Aucune description structurée n'a été publiée pour cette ressource sur le service étudiant."],
          },
        ];
  const highlights = [
    matiereCredit > 0 ? `${matiereCredit} crédit(s)` : null,
    matiereReference ? `Réf. programme : ${matiereReference}` : null,
    lecteursLabel ? `Encadrants : ${lecteursLabel}` : null,
    sectionRefLabel ? `Section : ${sectionRefLabel}` : null,
  ].filter((x): x is string => Boolean(x));

  return {
    kind: "resource",
    id,
    apiCategorie: apiC,
    urlCategorySlug: urlSlug,
    designation,
    amount,
    currency,
    status,
    matiereReference,
    matiereCredit,
    lecteursLabel,
    sectionRefLabel,
    programmeFiliereId,
    descriptionSections,
    highlights,
  };
}

export async function loadProductPageData(
  categorieSegment: string,
  productIdRaw: string
): Promise<ProductPageResult> {
  const categorieNorm = normalizeProductCategorySegment(categorieSegment);
  const id = normalizeMongoObjectIdString(String(productIdRaw ?? "").trim());
  if (!id) {
    return { ok: false, message: "Identifiant produit invalide." };
  }

  const label = humanizeProductCategory(categorieNorm);

  if (isActivityProductCategory(categorieNorm)) {
    const raw = await fetchActivitePublic(id);
    if (!raw) {
      return { ok: false, message: "Activité introuvable ou service indisponible." };
    }
    const vm = mapActivityToVM(raw, categorieNorm);
    if (!vm) return { ok: false, message: "Données d’activité invalides." };
    const apiCat = String(raw.categorie ?? "").trim().toUpperCase();
    if (apiCat && apiCat !== categorieNorm.toUpperCase()) {
      return {
        ok: false,
        message: `Cette page est pour un ${label}, mais l’activité est de type « ${apiCat} ».`,
      };
    }
    return { ok: true, model: vm, categoryLabel: label };
  }

  const apiCat = etudiantResourceApiCategorieFromUrl(categorieNorm);
  if (!apiCat) {
    return {
      ok: false,
      message: `Catégorie « ${categorieSegment} » non reconnue. Utilisez une ressource (sujet, stage, validation, …) ou une activité (qcm, tp).`,
    };
  }

  const raw = await fetchEtudiantResourceById(id);
  if (!raw) {
    return { ok: false, message: "Ressource introuvable ou accès au service impossible." };
  }
  const docCategorie = String(raw.categorie ?? "").trim().toLowerCase();
  if (docCategorie !== apiCat) {
    return {
      ok: false,
      message: `La ressource ne correspond pas au type « ${label} ».`,
    };
  }
  const vm = mapResourceToVM(raw, apiCat, categorieNorm);
  if (!vm) return { ok: false, message: "Données de ressource invalides." };
  return { ok: true, model: vm, categoryLabel: label };
}
