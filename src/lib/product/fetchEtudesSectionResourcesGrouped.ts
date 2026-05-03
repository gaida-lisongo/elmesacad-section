import { fetchEtudiantService } from "@/lib/service-auth/upstreamFetch";
import type { EtudiantResourceApiCategorie } from "@/lib/product/productRoute";
import {
  mapResourceRecordToProductVM,
  type ResourceProductVM,
} from "@/lib/product/loadProductPageData";

export type EtudesSectionResourcesGrouped = {
  validations: ResourceProductVM[];
  releves: ResourceProductVM[];
  laboratoires: ResourceProductVM[];
  stages: ResourceProductVM[];
  sujets: ResourceProductVM[];
  sessions: ResourceProductVM[];
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readJsonPayload(rawText: string): Record<string, unknown> {
  if (!rawText) return {};
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isListedStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "active" || s === "published" || s === "disponible";
}

async function fetchResourcesCategory(
  sectionRef: string,
  apiCategorie: EtudiantResourceApiCategorie,
  urlSlug: string
): Promise<ResourceProductVM[]> {
  const sp = new URLSearchParams({
    categorie: apiCategorie,
    page: "1",
    limit: "200",
  });
  sp.append("branding.sectionRef", sectionRef);

  let upstream: Response;
  try {
    upstream = await fetchEtudiantService(`/resources?${sp.toString()}`, { method: "GET" });
  } catch {
    return [];
  }

  const rawText = await upstream.text();
  const payload = readJsonPayload(rawText);
  if (!upstream.ok) return [];

  const data = Array.isArray(payload.data) ? payload.data : [];
  const out: ResourceProductVM[] = [];
  for (const item of data) {
    const row = pickObject(item);
    if (!row) continue;
    const vm = mapResourceRecordToProductVM(row, apiCategorie, urlSlug);
    if (!vm) continue;
    if (!isListedStatus(vm.status)) continue;
    out.push(vm);
  }
  return out;
}

const EMPTY: EtudesSectionResourcesGrouped = {
  validations: [],
  releves: [],
  laboratoires: [],
  stages: [],
  sujets: [],
  sessions: [],
};

/**
 * Charge toutes les ressources marketplace publiées pour une section (`branding.sectionRef`),
 * une fois au rendu serveur de la page Études.
 */
export async function fetchEtudesSectionResourcesGrouped(
  sectionSlug: string
): Promise<EtudesSectionResourcesGrouped> {
  const ref = String(sectionSlug ?? "").trim();
  if (!ref) return { ...EMPTY };

  const [
    validations,
    releves,
    laboratoires,
    stages,
    sujets,
    sessions,
  ] = await Promise.all([
    fetchResourcesCategory(ref, "validation", "fiche-validation"),
    fetchResourcesCategory(ref, "releve", "releve"),
    fetchResourcesCategory(ref, "labo", "laboratoire"),
    fetchResourcesCategory(ref, "stage", "stage"),
    fetchResourcesCategory(ref, "sujet", "sujet"),
    fetchResourcesCategory(ref, "session", "session"),
  ]);

  return {
    validations,
    releves,
    laboratoires,
    stages,
    sujets,
    sessions,
  };
}
