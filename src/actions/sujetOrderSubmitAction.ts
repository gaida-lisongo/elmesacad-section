"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import type { OrderSujetStudentPayload } from "@/lib/sujet/orderSujetTypes";
import { syncStudentTransactionFromCommande } from "@/lib/commande/syncStudentCommandeTransaction";
import { resolveParcoursId } from "@/lib/commande/createEtudiantOrderAfterMarketplacePaid";

/** Création commande « sujet » côté service étudiant (même route que les autres types). */
const COMMANDE_SUJET_CREATE_PATH = "/commandes";

function normalize(s: unknown): string {
  return String(s ?? "").trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function markSyncEnvelope(envelope: Record<string, unknown>): Record<string, unknown> {
  return { ...envelope, etudiantOrderSyncDone: true };
}

export type MarketplaceSujetOrderCreatePayload = {
  /** Requis par le modèle Order du microservice (même flux que POST /commandes historique). */
  parcoursId: string;
  ressourceId: string;
  student: { email: string; matricule: string };
  payment: "success";
  orderNumber: string;
  telephone: string;
  /** Identifiant commande marketplace (Mongo local). */
  reference: string;
  type: "sujet";
} & OrderSujetStudentPayload;

export type SubmitOrderSujetResearchResult =
  | { ok: true; microserviceBody: unknown }
  | { ok: false; message: string; status?: number; microserviceBody?: unknown };

/**
 * Crée la commande sujet sur le microservice étudiant (**POST /commandes**) avec la payload métier + commande marketplace,
 * puis passe la commande locale en **completed**.
 */
export async function submitOrderSujetResearchAction(input: {
  localCommandeId: string;
  payload: OrderSujetStudentPayload;
}): Promise<SubmitOrderSujetResearchResult> {
  const localId = String(input.localCommandeId ?? "").trim();
  const { payload } = input;

  console.log("[sujet][submit] début POST /commandes", { localCommandeId: localId, path: COMMANDE_SUJET_CREATE_PATH });

  if (!localId) {
    return { ok: false, message: "Identifiant commande marketplace manquant." };
  }

  await connectDB();
  const c = await CommandeModel.findById(localId);
  if (!c) {
    return { ok: false, message: "Commande locale introuvable." };
  }

  const email = normalize(c.student?.email).toLowerCase();
  const matricule = normalize(c.student?.matricule);
  const ressourceId = normalize(c.ressource?.reference);
  const telephone = normalize(c.transaction?.phoneNumber);
  const orderNumber = normalize(c.transaction?.orderNumber) || `MKP-${localId.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`;

  if (!email || !matricule || !ressourceId || !telephone) {
    console.warn("[sujet][submit] champs commande incomplets", { email, matricule, ressourceId, telephone });
    return {
      ok: false,
      message: "Commande incomplète (email, matricule, ressource ou téléphone manquant).",
    };
  }

  let parcoursId: string | null;
  try {
    parcoursId = await resolveParcoursId(email, matricule);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[sujet][submit] parcours lookup", message);
    return { ok: false, message: `Parcours : ${message}` };
  }

  if (!parcoursId) {
    return { ok: false, message: "Aucun parcours étudiant trouvé pour cet e-mail / matricule." };
  }

  const body: MarketplaceSujetOrderCreatePayload = {
    parcoursId,
    ressourceId,
    student: { email, matricule },
    payment: "success",
    orderNumber,
    telephone,
    reference: localId,
    type: "sujet",
    titre: payload.titre,
    directeur: payload.directeur,
    co_directeur: payload.co_directeur,
    thematique: payload.thematique,
    justification: payload.justification,
    problematique: payload.problematique,
    objectif: payload.objectif,
    methodologie: payload.methodologie,
    resultats_attendus: payload.resultats_attendus,
    chronogrammes: payload.chronogrammes,
    references: payload.references,
  };

  console.log("[sujet][submit] corps (aperçu)", {
    ...body,
    justification: body.justification?.slice(0, 2),
    methodologie: `[${body.methodologie?.length ?? 0} sections]`,
  });

  let res: Response;
  try {
    res = await fetchEtudiantApi(COMMANDE_SUJET_CREATE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Réseau indisponible.";
    console.error("[sujet][submit] réseau", message);
    return { ok: false, message };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  console.log("[sujet][submit] réponse microservice", {
    httpStatus: res.status,
    ok: res.ok,
    bodyPreview: typeof parsed === "object" ? JSON.stringify(parsed).slice(0, 800) : String(parsed).slice(0, 200),
  });

  if (!res.ok) {
    const msg =
      isRecord(parsed) && (String(parsed.message || parsed.error || "").trim() || true)
        ? String(parsed.message || parsed.error || `Erreur service (${res.status})`)
        : `Erreur service (${res.status})`;
    return { ok: false, message: msg, status: res.status, microserviceBody: parsed };
  }

  const fresh = await CommandeModel.findById(localId);
  if (!fresh) {
    return { ok: false, message: "Commande locale introuvable après création côté microservice." };
  }

  const prevMs = fresh.transaction?.microserviceResponse;
  const prevObj = isRecord(prevMs) ? { ...prevMs } : {};

  const envelope = markSyncEnvelope(
    isRecord(parsed)
      ? {
          ...parsed,
          marketplaceSync: true,
          httpStatus: res.status,
        }
      : {
          success: true,
          marketplaceSync: true,
          httpStatus: res.status,
          data: parsed,
        }
  );

  fresh.status = "completed";
  fresh.transaction = {
    ...fresh.transaction,
    microserviceResponse: {
      ...prevObj,
      ...envelope,
    } as unknown,
  };
  await fresh.save();
  await syncStudentTransactionFromCommande(fresh);

  console.log("[sujet][submit] commande locale completed + réponse persistée", { localCommandeId: localId });

  return { ok: true, microserviceBody: parsed };
}
