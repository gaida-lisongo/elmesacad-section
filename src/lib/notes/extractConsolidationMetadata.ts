function pickRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function stringifyMongoField(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  const o = pickRecord(v);
  if (o && "$oid" in o) return String((o as { $oid?: unknown }).$oid ?? "").trim();
  return "";
}

/** Même forme que le retour de `extractConsolidationContextFromCommandeMetadata`. */
export type ConsolidationProgrammeContext = {
  sectionRef: string;
  programmeId: string;
  anneeSlug?: string;
};

/**
 * Fusionne les champs branding/programme du document ressource service étudiant
 * avec les métadonnées déjà stockées sur la commande.
 * Les champs commande (anneeSlug, fullName, productTitle, …) sont conservés ; les blocs
 * `branding` / `programme` vides sur la commande n’écrasent pas ceux renvoyés par le service.
 */
export function commandeMetadataAugmentedFromEtudiantResource(
  meta: Record<string, unknown> | undefined,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const branding = pickRecord(raw.branding);
  const programme = pickRecord(raw.programme);
  const fromResource: Record<string, unknown> = {};
  if (branding && Object.keys(branding).length > 0) {
    fromResource.branding = branding;
  }
  if (programme && Object.keys(programme).length > 0) {
    fromResource.programme = programme;
  }
  const pf = String(programme?.filiere ?? "").trim();
  if (pf) {
    fromResource.programmeFiliere = pf;
  }
  const sr = String(branding?.sectionRef ?? "").trim();
  if (sr) {
    fromResource.sectionRef = sr;
  }
  return { ...(meta ?? {}), ...fromResource };
}

/** Contexte pour consolider les notes (relevé / fiche de validation) à partir des métadonnées de commande marketplace. */
export function extractConsolidationContextFromCommandeMetadata(
  metadata: Record<string, unknown> | undefined
): ConsolidationProgrammeContext | null {
  // console.log("[extractConsolidationContextFromCommandeMetadata] metadata : ", metadata);
  if (!metadata || typeof metadata !== "object") return null;
  const branding = pickRecord(metadata.branding);
  // console.log("[extractConsolidationContextFromCommandeMetadata] branding : ", branding);
  const sectionRef = String(metadata.sectionRef ?? branding?.sectionRef ?? "").trim();
  // console.log("[extractConsolidationContextFromCommandeMetadata] sectionRef : ", sectionRef);
  const programme = pickRecord(metadata.programme);
  // console.log("[extractConsolidationContextFromCommandeMetadata] programme : ", programme);
  const programmeId =
    String(programme?.filiere ?? "").trim() ||
    stringifyMongoField(programme?._id) ||
    String(programme?.id ?? "").trim() ||
    String(metadata.programmeFiliere ?? "").trim();
  // console.log("[extractConsolidationContextFromCommandeMetadata] programmeId : ", programmeId);
  const anneeRaw = String(metadata.anneeSlug ?? "").trim();
  // console.log("[extractConsolidationContextFromCommandeMetadata] anneeRaw : ", anneeRaw);
  const anneeSlug = anneeRaw || undefined;
  // console.log("[extractConsolidationContextFromCommandeMetadata] anneeSlug : ", anneeSlug);
  if (!sectionRef || !programmeId) return null;
  return { sectionRef, programmeId, anneeSlug };
}

/**
 * Même contrat que les métadonnées commande, à partir du document ressource SSR
 * (`programme.filiere` = slug du programme, `branding.sectionRef`, `annee.slug`).
 */
export function extractConsolidationContextFromProduitRecord(
  raw: Record<string, unknown> | null | undefined
): ConsolidationProgrammeContext | null {
  if (!raw) return null;
  const branding = pickRecord(raw.branding);
  const programme = pickRecord(raw.programme);
  const annee = pickRecord(raw.annee);
  const sectionRef = String(raw.sectionRef ?? branding?.sectionRef ?? "").trim();
  const programmeId =
    String(programme?.filiere ?? "").trim() ||
    stringifyMongoField(programme?._id) ||
    String(programme?.id ?? "").trim() ||
    String(raw.programmeFiliere ?? "").trim();
  const anneeSlug =
    String(raw.anneeSlug ?? "").trim() ||
    String(annee?.slug ?? "").trim() ||
    undefined;
  if (!sectionRef || !programmeId) return null;
  return { sectionRef, programmeId, anneeSlug: anneeSlug || undefined };
}
