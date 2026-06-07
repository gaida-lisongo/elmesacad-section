"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import userManager from "@/lib/services/UserManager";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import {
  buildDocumentMacaronPayload,
  type DocumentMacaronPayload,
} from "@/lib/paiement/sessionEnrollementContext";
import { generateMacaronPdfAction } from "@/actions/macaronGenerate";
import type { GenerateMacaronPdfResult } from "@/actions/macaronGenerate";

export type BackofficeMacaronResult =
  | { ok: true; filename: string; pdfBase64: string; commandeId: string }
  | { ok: false; message: string };

/**
 * Génère le macaron pour un étudiant depuis le backoffice.
 * Rassemble les données (commande, étudiant, produit) et délégué à `generateMacaronPdfAction`.
 */
export async function backofficeMacaronGenerateAction(input: {
  commandeId: string;
  sectionSlug: string;
}): Promise<BackofficeMacaronResult> {
  const { commandeId, sectionSlug } = input;
  if (!commandeId || !sectionSlug) {
    return { ok: false, message: "commandeId et sectionSlug requis." };
  }

  try {
    await connectDB();

    // 1. Récupérer la commande
    const commande = await CommandeModel.findById(commandeId).lean();
    if (!commande) return { ok: false, message: "Commande introuvable." };

    const email = String(commande.student?.email ?? "").trim().toLowerCase();
    const matricule = String(commande.student?.matricule ?? "").trim();
    if (!email || !matricule) {
      return { ok: false, message: "Email ou matricule manquant sur la commande." };
    }

    // 2. Récupérer l'étudiant local
    const etudiant = await userManager.getStudentByMatriculeAndEmail(matricule, email);

    // 3. Récupérer le produit detail (ressource session) depuis le service étudiant
    const ressourceId = String(commande.ressource?.reference ?? "").trim();
    let produitDetail: Record<string, unknown> | null = null;
    if (ressourceId) {
      try {
        const upstream = await fetchEtudiantApi(
          `/sections/${encodeURIComponent(sectionSlug)}/ressources/${encodeURIComponent(ressourceId)}`,
          { method: "GET", cache: "no-store" }
        );
        if (upstream.ok) {
          const json = (await upstream.json()) as Record<string, unknown>;
          produitDetail = (json.data ?? json) as Record<string, unknown>;
        }
      } catch (e) {
        console.error("[backofficeMacaron] fetch ressource detail error:", e);
      }
    }

    // 4. Construire le payload PaiementCommandeClientPayload
    const meta =
      commande.ressource?.metadata != null &&
      typeof commande.ressource.metadata === "object" &&
      !Array.isArray(commande.ressource.metadata)
        ? (commande.ressource.metadata as Record<string, unknown>)
        : {};

    const commandePayload = {
      id: String(commande._id),
      status: commande.status,
      student: { email, matricule },
      ressource: {
        reference: ressourceId,
        produit: commande.ressource?.produit,
        categorie: commande.ressource?.categorie,
        metadata: meta,
      },
      transaction: {
        orderNumber: commande.transaction?.orderNumber,
        amount: commande.transaction?.amount,
        currency: commande.transaction?.currency,
        phoneNumber: commande.transaction?.phoneNumber,
        microservice: { syncAttempted: false },
      },
    };

    // 5. Construire le payload du macaron
    const etudiantView = etudiant
      ? {
          id: String(etudiant._id),
          name: String(etudiant.name ?? ""),
          email: String(etudiant.email ?? ""),
          matricule: String(etudiant.matricule ?? ""),
          sexe: String(etudiant.sexe ?? ""),
          telephone: String(etudiant.telephone ?? ""),
          photo: String(etudiant.photo ?? ""),
          diplome: String(etudiant.diplome ?? ""),
          cycle: String(etudiant.cycle ?? ""),
          nationalite: String(etudiant.nationalite ?? ""),
          ville: String(etudiant.ville ?? ""),
          status: String(etudiant.status ?? "active"),
          dateDeNaissance: etudiant.dateDeNaissance ? etudiant.dateDeNaissance.toISOString() : "",
          lieuDeNaissance: String(etudiant.lieuDeNaissance ?? ""),
          adresse: String(etudiant.adresse ?? ""),
        }
      : null;

    const macaronPayload: DocumentMacaronPayload = buildDocumentMacaronPayload({
      commande: commandePayload as Parameters<typeof buildDocumentMacaronPayload>[0]["commande"],
      commandeId: String(commande._id),
      etudiant: etudiantView,
      produitDetail,
    });

    // 6. Générer le PDF
    const pdfResult = await generateMacaronPdfAction(macaronPayload);

    if (!pdfResult.ok) {
      return { ok: false, message: pdfResult.message };
    }

    return {
      ok: true,
      filename: pdfResult.filename,
      pdfBase64: pdfResult.pdfBase64,
      commandeId: String(commande._id),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur lors de la génération du macaron.",
    };
  }
}