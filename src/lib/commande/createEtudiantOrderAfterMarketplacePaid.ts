import type { HydratedDocument } from "mongoose";
import type { CommandeDoc } from "@/lib/models/Commande";
import type { CommandeProduit } from "@/lib/constants/commandeProduit";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { persistCommandeMicroserviceResponseAndSyncStudent } from "@/lib/commande/syncStudentCommandeTransaction";
import { extractMicroserviceOrderId } from "@/lib/commande/extractMicroserviceOrderId";

function normalize(s: unknown): string {
  return String(s ?? "").trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function markSyncEnvelope(envelope: Record<string, unknown>): Record<string, unknown> {
  return { ...envelope, etudiantOrderSyncDone: true };
}

/**
 * Sync marketplace → POST /commandes déjà faite ou inutile (évite doublons côté service étudiant).
 */
function alreadySyncedEtudiantOrder(ms: unknown): boolean {
  if (!isRecord(ms)) return false;
  if (ms.etudiantOrderSyncDone === true) return true;
  if (ms.marketplaceSync === true && ms.success === false) return true;
  if ((ms.success === true || extractMicroserviceOrderId(ms)) && ms.marketplaceSync === true) return true;
  return false;
}

function etudiantCommandeType(produit: CommandeProduit): "labo" | "stage" | "sujet" | "session" | "resultat" | null {
  switch (produit) {
    case "laboratoire":
      return "labo";
    case "session":
      return "session";
    case "stage":
      return "stage";
    case "sujet":
      return "sujet";
    case "fiche-validation":
    case "releve":
    case "recours":
      return "resultat";
    default:
      return null;
  }
}

/** Résolution parcours étudiant (GET service) — réutilisable pour la création différée de commande « sujet ». */
export async function resolveParcoursId(email: string, matricule: string): Promise<string | null> {
  const res = await fetchEtudiantApi(
    `/parcours/by-student-email?email=${encodeURIComponent(email.toLowerCase())}`,
    { method: "GET" }
  );
  const body = (await res.json().catch(() => ({}))) as { data?: unknown };
  const rows = Array.isArray(body.data) ? body.data : [];
  const m = matricule.trim().toLowerCase();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const stud = row.student;
    if (isRecord(stud) && normalize(stud.matricule).toLowerCase() === m) {
      const id = normalize(row._id ?? row.id);
      if (id) return id;
    }
  }
  if (rows.length === 1 && isRecord(rows[0])) {
    const id = normalize(rows[0]._id ?? rows[0].id);
    if (id) return id;
  }
  return null;
}

function sectionBlock(title: string) {
  return [{ title: "Document", contenu: [title] }];
}

/**
 * Corps POST /api/commandes (service étudiant) selon le type marketplace.
 * Champs manquants pour sujet/stage : valeurs provisoires — à affiner côté formulaire plus tard.
 */
function buildEtudiantCreatePayload(
  type: "labo" | "stage" | "sujet" | "session" | "resultat",
  parcoursId: string,
  ressourceId: string,
  telephone: string,
  meta: Record<string, unknown>
): Record<string, unknown> {
  const titre = normalize(meta.productTitle) || "Commande marketplace INBTP";
  const fullName = normalize(meta.fullName) || "Étudiant";

  const base: Record<string, unknown> = {
    type,
    parcoursId,
    ressourceId,
    telephone,
    payment: "success",
  };

  switch (type) {
    case "labo":
      return { ...base, cote: 0, observation: `Marketplace — ${titre}` };
    case "session":
      return { ...base, bulletin: false };
    case "resultat":
      return base;
    case "stage":
      return {
        ...base,
        stageTitle: titre,
        recipientName: fullName,
        recipientQuality: "Étudiant",
        recipientSex: "M",
        companyName: "À préciser (complété par l'étudiant)",
        companyLocation: "À préciser",
      };
    case "sujet":
      return {
        ...base,
        titre,
        directeur: "À compléter",
        co_directeur: "À compléter",
        thematique: "À compléter",
        justification: [`Commande marketplace — ${titre}`],
        problematique: ["—"],
        objectif: ["—"],
        methodologie: sectionBlock("Méthodologie"),
        resultats_attendus: sectionBlock("Résultats attendus"),
        chronogrammes: sectionBlock("Chronogramme"),
        references: sectionBlock("Références"),
      };
    default:
      return base;
  }
}

/**
 * Après paiement FlexPay confirmé : crée la commande métier sur le service étudiant (hors activités QCM/TP).
 * Réponse persistée sur `Commande.transaction.microserviceResponse` + ligne `Student.transactions`.
 */
export async function createEtudiantOrderAfterMarketplacePaid(
  commande: HydratedDocument<CommandeDoc>
): Promise<void> {
  const produit = commande.ressource?.produit;
  if (produit === "activite") return;

  const type = produit ? etudiantCommandeType(produit) : null;
  if (!type) return;

  /** Sujet : la commande service étudiant est créée au POST `/commandes` après le formulaire (payload complète). */
  if (type === "sujet") {
    return;
  }

  const ms = commande.transaction?.microserviceResponse;
  if (alreadySyncedEtudiantOrder(ms)) return;

  const email = normalize(commande.student?.email).toLowerCase();
  const matricule = normalize(commande.student?.matricule);
  const ressourceId = normalize(commande.ressource?.reference);
  const telephone = normalize(commande.transaction?.phoneNumber);
  if (!email || !matricule || !ressourceId || !telephone) {
    await persistCommandeMicroserviceResponseAndSyncStudent(
      String(commande._id),
      markSyncEnvelope({
        success: false,
        error: "sync_etudiant_order_incomplete",
        message: "email, matricule, ressource ou téléphone manquant pour la commande étudiant.",
      })
    );
    return;
  }

  let parcoursId: string | null;
  try {
    parcoursId = await resolveParcoursId(email, matricule);
  } catch (e) {
    await persistCommandeMicroserviceResponseAndSyncStudent(
      String(commande._id),
      markSyncEnvelope({
        success: false,
        error: "parcours_lookup_failed",
        message: e instanceof Error ? e.message : String(e),
      })
    );
    return;
  }

  if (!parcoursId) {
    await persistCommandeMicroserviceResponseAndSyncStudent(
      String(commande._id),
      markSyncEnvelope({
        success: false,
        error: "parcours_not_found",
        message: "Aucun parcours étudiant trouvé pour cet e-mail / matricule.",
      })
    );
    return;
  }

  const meta =
    commande.ressource?.metadata != null && isRecord(commande.ressource.metadata)
      ? commande.ressource.metadata
      : {};

  const payload = buildEtudiantCreatePayload(type, parcoursId, ressourceId, telephone, meta);

  let upstream: Response;
  try {
    upstream = await fetchEtudiantApi("/commandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    await persistCommandeMicroserviceResponseAndSyncStudent(String(commande._id), {
      success: false,
      error: "etudiant_network",
      message: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const rawText = await upstream.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    parsed = { raw: rawText.slice(0, 2000) };
  }

  const envelope =
    upstream.ok && isRecord(parsed)
      ? markSyncEnvelope({
          ...parsed,
          marketplaceSync: true,
          httpStatus: upstream.status,
        })
      : markSyncEnvelope({
          success: false,
          httpStatus: upstream.status,
          marketplaceSync: true,
          error: "etudiant_commandes_post_failed",
          body: parsed,
        });

  await persistCommandeMicroserviceResponseAndSyncStudent(String(commande._id), envelope);
}
