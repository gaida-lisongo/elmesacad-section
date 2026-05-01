import type { HydratedDocument } from "mongoose";
import { CommandeModel, type CommandeDoc } from "@/lib/models/Commande";
import { connectDB } from "@/lib/services/connectedDB";
import { extractMicroserviceOrderId } from "@/lib/commande/extractMicroserviceOrderId";
import userManager from "@/lib/services/UserManager";

/**
 * Recopie sur la fiche étudiant (`transactions[]`) l’id d’ordre microservice et/ou la charge utile,
 * liés à la commande locale (`commandeId`).
 */
export async function syncStudentTransactionFromCommande(
  commande: HydratedDocument<CommandeDoc>
): Promise<void> {
  const ms = commande.transaction?.microserviceResponse;
  const microserviceOrderId = extractMicroserviceOrderId(ms);
  const hasPayload = ms !== undefined && ms !== null;

  if (!microserviceOrderId && !hasPayload) {
    return;
  }

  const student = await userManager.getStudentByMatriculeAndEmail(
    commande.student.matricule,
    commande.student.email
  );
  if (!student?._id) return;

  const categorie =
    String(commande.ressource?.produit ?? commande.ressource?.categorie ?? "activite").trim() ||
    "activite";

  await userManager.upsertStudentTransactionForCommande(student._id, {
    commandeId: String(commande._id),
    ressourceId: String(commande.ressource?.reference ?? "").trim() || "—",
    amount: Number(commande.transaction?.amount ?? 0),
    status:
      commande.status === "failed"
        ? "failed"
        : commande.status === "pending"
          ? "pending"
          : "paid",
    categorie,
    microserviceOrderId,
    microserviceData: hasPayload ? ms : undefined,
  });
}

/** Persiste `transaction.microserviceResponse` sur la commande puis répercute sur `Student.transactions`. */
export async function persistCommandeMicroserviceResponseAndSyncStudent(
  commandeId: string,
  microserviceResponse: unknown
): Promise<boolean> {
  await connectDB();
  const c = await CommandeModel.findById(commandeId);
  if (!c) return false;
  c.transaction = {
    ...c.transaction,
    microserviceResponse,
  } as CommandeDoc["transaction"];
  await c.save();
  await syncStudentTransactionFromCommande(c);
  return true;
}
