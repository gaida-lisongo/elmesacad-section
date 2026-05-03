import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import type { CommandeDoc } from "@/lib/models/Commande";
import { syncCommandePaymentStatusFromProvider } from "@/lib/commande/commandePayment";
import { summarizeCommandeForClient } from "@/lib/commande/summarizeCommandeForClient";
import userManager from "@/lib/services/UserManager";
import {
  fetchTitulaireService,
  getEtudiantServiceBase,
  getTitulaireServiceBase,
} from "@/lib/service-auth/upstreamFetch";
import {
  etudiantServiceUrl,
  fetchEtudiantApi,
  normalizeEtudiantPath,
} from "@/lib/etudiant-service/etudiantRemote";
import type {
  PaiementActiviteHydration,
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementPageHydration,
  PaiementProduitHydration,
  PaiementRessourceHydration,
  PaiementSectionBranding,
} from "@/app/paiement/_components/commandeResumePayload";

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractArray(payload: unknown, preferredKeys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];
  for (const key of preferredKeys) {
    const v = root[key];
    if (Array.isArray(v)) return v;
  }
  const dataObj = pickObject(root.data);
  if (dataObj) {
    for (const key of preferredKeys) {
      const v = dataObj[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function parseDateIso(raw: unknown): string {
  if (!raw) return "";
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function normalizeActiviteCategorie(raw: unknown): "TP" | "QCM" | null {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "TP" || v === "QCM") return v;
  return null;
}

function emptySectionBranding(): PaiementSectionBranding {
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

function brandingFromResource(r: Record<string, unknown>): PaiementSectionBranding {
  const b = pickObject(r.branding);
  if (!b) return emptySectionBranding();
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function ressourceRowToHydration(row: Record<string, unknown>, fallbackId: string): PaiementRessourceHydration {
  const rid = String(row._id ?? row.id ?? fallbackId).trim();
  return {
    kind: "ressource",
    id: rid || fallbackId,
    categorie: String(row.categorie ?? "").trim(),
    designation: String(row.designation ?? "").trim(),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "USD").trim() || "USD",
    status: String(row.status ?? "").trim(),
    section: brandingFromResource(row),
  };
}

/**
 * Réponse persistée après POST /api/commandes (service étudiant) : parfois `data.ressource` peuplé.
 */
function tryExtractResourceRowFromMicroservice(ms: unknown): Record<string, unknown> | null {
  if (!isRecord(ms)) return null;
  const data = ms.data;
  if (!isRecord(data)) return null;

  for (const key of ["ressource", "resource"] as const) {
    const n = data[key];
    if (isRecord(n) && (n.designation != null || n.categorie != null || n.branding != null || n._id != null)) {
      return n;
    }
  }

  if (data.designation != null || data.categorie != null || data.branding != null) return data;

  const inner = data.data;
  if (isRecord(inner)) {
    for (const key of ["ressource", "resource"] as const) {
      const n = inner[key];
      if (isRecord(n) && (n.designation != null || n.categorie != null || n.branding != null)) return n;
    }
  }
  return null;
}

function ressourceHydrationFromCommandeMetadata(
  commande: CommandeDoc,
  resourceRef: string
): PaiementRessourceHydration {
  const meta = pickObject(commande.ressource?.metadata) ?? {};
  const tx = commande.transaction;
  const titre = String(meta.productTitle ?? meta.designation ?? "").trim();
  const cat = String(commande.ressource?.categorie ?? meta.categoriePath ?? "")
    .trim()
    .toLowerCase();
  return {
    kind: "ressource",
    id: resourceRef,
    categorie: cat || "—",
    designation: titre || "Ressource (commande)",
    amount: Number(tx?.amount ?? 0),
    currency: tx?.currency === "CDF" ? "CDF" : "USD",
    status: "—",
    section: emptySectionBranding(),
  };
}

function buildRessourceHydrationFallback(
  commande: CommandeDoc,
  resourceRef: string
): {
  hydration: PaiementRessourceHydration;
  source: "microservice" | "metadata";
  raw?: Record<string, unknown>;
} | null {
  const fromMs = tryExtractResourceRowFromMicroservice(commande.transaction?.microserviceResponse);
  if (fromMs) {
    return {
      hydration: ressourceRowToHydration(fromMs, resourceRef),
      source: "microservice",
      raw: fromMs,
    };
  }
  if (commande.ressource?.metadata != null && resourceRef) {
    return { hydration: ressourceHydrationFromCommandeMetadata(commande, resourceRef), source: "metadata" };
  }
  return null;
}

async function fetchActiviteHydration(activiteId: string): Promise<{
  mapped: PaiementActiviteHydration | null;
  raw: Record<string, unknown> | null;
}> {
  const id = String(activiteId ?? "").trim();
  if (!id || !getTitulaireServiceBase()) return { mapped: null, raw: null };
  const paths = [
    `/activites/${encodeURIComponent(id)}`,
    `/activites/get/${encodeURIComponent(id)}`,
    `/activites/by-id/${encodeURIComponent(id)}`,
    "/activites/all",
  ];
  for (const path of paths) {
    const res = await fetchTitulaireService(path, { method: "GET" });
    if (!res.ok) continue;
    const payload = await res.json().catch(() => ({}));
    if (path !== "/activites/all") {
      const root = pickObject(payload);
      const data = (pickObject(root?.data) ?? root) as Record<string, unknown> | null;
      if (!data) continue;
      const rawId = String(data._id ?? data.id ?? "").trim();
      if (rawId !== id) continue;
      const categorie = normalizeActiviteCategorie(data.categorie);
      if (!categorie) continue;
      return {
        mapped: {
          kind: "activite",
          id: rawId,
          categorie,
          noteMaximale: Number(data.note_maximale ?? 0),
          dateRemise: parseDateIso(data.date_remise),
          status: String(data.status ?? "").trim(),
        },
        raw: data,
      };
    }
    const rows = extractArray(payload, ["data", "items", "rows", "list", "activites"]);
    const found = rows.find((r) => {
      const o = pickObject(r);
      return String(o?._id ?? o?.id ?? "").trim() === id;
    });
    const x = pickObject(found);
    if (!x) continue;
    const categorie = normalizeActiviteCategorie(x.categorie);
    if (!categorie) continue;
    return {
      mapped: {
        kind: "activite",
        id,
        categorie,
        noteMaximale: Number(x.note_maximale ?? 0),
        dateRemise: parseDateIso(x.date_remise),
        status: String(x.status ?? "").trim(),
      },
      raw: x,
    };
  }
  return { mapped: null, raw: null };
}

const LOG_RES = "[paiement/hydrate][resource]";

function previewBody(text: string, max = 900): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

async function fetchRessourceHydration(resourceId: string): Promise<{
  mapped: PaiementRessourceHydration | null;
  raw: Record<string, unknown> | null;
}> {
  const id = String(resourceId ?? "").trim();
  if (!id) {
    console.warn(LOG_RES, "aborted: empty resourceId");
    return { mapped: null, raw: null };
  }

  const relPath = `/resources/${encodeURIComponent(id)}`;
  const base = getEtudiantServiceBase();
  const normalizedPath = normalizeEtudiantPath(relPath);
  let requestUrl: string;
  try {
    requestUrl = etudiantServiceUrl(relPath);
  } catch (e) {
    console.error(LOG_RES, "cannot build URL (ETUDIANT_SERVICE ?)", {
      resourceId: id,
      relPath,
      normalizedPath,
      basePresent: Boolean(base),
      error: e instanceof Error ? e.message : String(e),
    });
    return { mapped: null, raw: null };
  }

  console.info(LOG_RES, "request", {
    resourceId: id,
    relPath,
    normalizedPath,
    requestUrl,
    baseHost: (() => {
      if (!base) return null;
      try {
        return new URL(base).host;
      } catch {
        return "(base-url-parse-error)";
      }
    })(),
  });

  let res: Response;
  try {
    res = await fetchEtudiantApi(relPath, { method: "GET" });
  } catch (e) {
    console.error(LOG_RES, "fetch threw (réseau / TLS / timeout)", {
      resourceId: id,
      requestUrl,
      name: e instanceof Error ? e.name : typeof e,
      message: e instanceof Error ? e.message : String(e),
      cause:
        e instanceof Error && "cause" in e && e.cause != null
          ? e.cause instanceof Error
            ? { message: e.cause.message, name: e.cause.name }
            : String(e.cause)
          : undefined,
    });
    throw e;
  }

  const rawText = await res.text().catch((e) => {
    console.error(LOG_RES, "res.text() failed", e);
    return "";
  });

  console.info(LOG_RES, "response meta", {
    resourceId: id,
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    contentType: res.headers.get("content-type"),
    bodyLength: rawText.length,
    bodyPreview: previewBody(rawText, 700),
  });

  let payload: Record<string, unknown>;
  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch (parseErr) {
    console.error(LOG_RES, "JSON.parse failed", {
      resourceId: id,
      parseErr: parseErr instanceof Error ? parseErr.message : String(parseErr),
      bodyPreview: previewBody(rawText, 700),
    });
    return { mapped: null, raw: null };
  }

  if (!res.ok) {
    console.warn(LOG_RES, "HTTP non OK — abandon parse métier", {
      resourceId: id,
      status: res.status,
      payloadTopLevelKeys: Object.keys(payload),
      errorField: payload.error ?? payload.message,
    });
    return { mapped: null, raw: null };
  }

  if (payload.success === false) {
    console.warn(LOG_RES, "payload.success === false", {
      resourceId: id,
      payload: previewBody(JSON.stringify(payload), 1200),
    });
    return { mapped: null, raw: null };
  }

  const row = (pickObject(payload.data) ?? pickObject(payload)) as Record<string, unknown> | null;
  if (!row) {
    console.warn(LOG_RES, "no row after parse (data / racine vides ou non-objet)", {
      resourceId: id,
      hasDataKey: "data" in payload,
      keys: Object.keys(payload),
    });
    return { mapped: null, raw: null };
  }

  console.info(LOG_RES, "parsed row", {
    resourceId: id,
    rowId: String(row._id ?? row.id ?? id).trim(),
    categorie: row.categorie,
    designation: row.designation,
    hasBranding: Boolean(row.branding && typeof row.branding === "object"),
  });

  return { mapped: ressourceRowToHydration(row, id), raw: row };
}

function serializeStudent(doc: unknown): PaiementEtudiantLocalView | null {
  if (!doc || typeof doc !== "object") return null;
  const withToObject = doc as { toObject?: () => Record<string, unknown> };
  const o =
    typeof withToObject.toObject === "function"
      ? withToObject.toObject()
      : (doc as Record<string, unknown>);
  const dob = o.dateDeNaissance;
  let dateDeNaissance: string | null = null;
  if (dob instanceof Date) dateDeNaissance = dob.toISOString();
  else if (dob) dateDeNaissance = String(dob);
  return {
    id: String(o._id ?? ""),
    name: String(o.name ?? "").trim(),
    email: String(o.email ?? "").trim().toLowerCase(),
    matricule: String(o.matricule ?? "").trim(),
    sexe: String(o.sexe ?? "").trim(),
    telephone: String(o.telephone ?? "").trim(),
    photo: String(o.photo ?? "").trim(),
    diplome: String(o.diplome ?? "").trim(),
    cycle: String(o.cycle ?? "").trim(),
    status: String(o.status ?? "").trim(),
    ville: String(o.ville ?? "").trim(),
    dateDeNaissance,
    nationalite: String(o.nationalite ?? "").trim(),
    lieuDeNaissance: String(o.lieuDeNaissance ?? "").trim(),
    adresse: String(o.adresse ?? "").trim(),
  };
}

/**
 * Charge en SSR la commande marketplace locale, l’étudiant (MongoDB app),
 * puis le produit (activité titulaire ou ressource service étudiant).
 */
export async function hydratePaiementCommande(
  commandeId: string
): Promise<{ ok: true; data: PaiementPageHydration } | { ok: false }> {
  const id = String(commandeId ?? "").trim();
  if (!id) return { ok: false };

  await connectDB();

  const mutable = await CommandeModel.findById(id);
  if (!mutable) return { ok: false };

  if (mutable.status === "pending" || mutable.status === "failed") {
    await syncCommandePaymentStatusFromProvider(mutable);
  }

  const commande = await CommandeModel.findById(id).lean<CommandeDoc & { _id: unknown }>();
  if (!commande) return { ok: false };

  const commandePayload = summarizeCommandeForClient(commande) as PaiementCommandeClientPayload;

  const email = String(commande.student?.email ?? "")
    .trim()
    .toLowerCase();
  const matricule = String(commande.student?.matricule ?? "").trim();
  const studentDoc =
    email && matricule ? await userManager.getStudentByMatriculeAndEmail(matricule, email) : null;
  const etudiantLocal = serializeStudent(studentDoc);

  const ref = String(commande.ressource?.reference ?? "").trim();
  const produit = String(commande.ressource?.produit ?? "").trim();

  let produitHydration: PaiementProduitHydration | null = null;
  let produitDetail: Record<string, unknown> | null = null;
  let produitError: string | undefined;

  if (!ref) {
    produitError = "Référence produit manquante sur la commande.";
  } else if (produit === "activite") {
    if (!getTitulaireServiceBase()) {
      produitError = "Service titulaire non configuré.";
    } else {
      try {
        const act = await fetchActiviteHydration(ref);
        produitHydration = act.mapped;
        if (act.raw) produitDetail = act.raw;
        if (!produitHydration) produitError = "Activité introuvable ou inaccessible.";
      } catch {
        produitError = "Impossible de charger l’activité.";
      }
    }
  } else {
    try {
      const fetched = await fetchRessourceHydration(ref);
      produitHydration = fetched.mapped;
      if (fetched.raw) produitDetail = fetched.raw;
      if (!produitHydration) produitError = "Ressource introuvable ou inaccessible.";
    } catch (e) {
      console.error("[paiement/hydrate]", "fetch resource threw (voir aussi [resource] fetch threw)", {
        commandeId: id,
        ressourceReference: ref,
        produitType: produit,
        name: e instanceof Error ? e.name : typeof e,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
        cause:
          e instanceof Error && "cause" in e && e.cause != null
            ? e.cause instanceof Error
              ? { name: e.cause.name, message: e.cause.message }
              : String(e.cause)
            : undefined,
      });
      produitError = "Impossible de charger la ressource.";
    }

    if (!produitHydration) {
      const fb = buildRessourceHydrationFallback(commande, ref);
      if (fb) {
        produitHydration = fb.hydration;
        if (fb.raw) produitDetail = fb.raw;
        else if (fb.source === "metadata") {
          const meta = pickObject(commande.ressource?.metadata) ?? {};
          produitDetail = {
            ...meta,
            _id: ref,
            designation: fb.hydration.designation,
            categorie: fb.hydration.categorie,
            amount: fb.hydration.amount,
            currency: fb.hydration.currency,
          };
        }
        const hint =
          fb.source === "metadata"
            ? "Le serveur Next ne joint pas le service étudiant (timeout / pare-feu / réseau différent du navigateur). Libellé et montant issus des métadonnées de commande."
            : "GET ressource indisponible ; détail repris depuis la dernière réponse de synchronisation commande étudiant.";
        produitError = produitError ? `${produitError} ${hint}` : hint;
        console.warn("[paiement/hydrate]", "ressource fallback appliqué", {
          commandeId: id,
          ressourceReference: ref,
          source: fb.source,
        });
      }
    }
  }

  return {
    ok: true,
    data: {
      commande: commandePayload,
      etudiantLocal,
      produit: produitHydration,
      produitDetail,
      produitError,
    },
  };
}
