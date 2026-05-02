import type { HydratedDocument } from "mongoose";
import type { CommandeDoc } from "@/lib/models/Commande";
import { runCheckWithLogging, runCollectWithLogging } from "@/lib/payment/paymentRun";
import {
  extractFlexPayOrderKeyFromPayload,
  extractTransactionStatusFromCheckResponse,
  mapProviderTransactionToDeposit,
} from "@/lib/payment/transactionStatus";
import type { CollectMobileMoneyPayload, PaymentResponse } from "@/lib/services/PaymentService";
import { RechargeModel } from "@/lib/models/Recharge";
import { CommandeModel } from "@/lib/models/Commande";
import userManager from "@/lib/services/UserManager";
import { createEtudiantOrderAfterMarketplacePaid } from "@/lib/commande/createEtudiantOrderAfterMarketplacePaid";

export type CommandePaymentTransaction = CommandeDoc["transaction"];

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Extrait la clé suivie FlexPay (orderNumber ou reference) depuis le collect / une couche data imbriquée.
 */
export function extractOrderNumberFromCollectData(data: unknown): string | undefined {
  return extractFlexPayOrderKeyFromPayload(data);
}

export function buildTransactionFromCollectResponse(
  response: PaymentResponse,
  phoneNumber: string,
  fallbackAmount: number,
  fallbackCurrency: "USD" | "CDF"
): CommandePaymentTransaction {
  const rawData = response.data;
  const paymentData =
    rawData != null && typeof rawData === "object"
      ? ((((rawData as Record<string, unknown>).data ?? rawData) as Record<string, unknown>) ?? {})
      : {};

  return {
    orderNumber: extractOrderNumberFromCollectData(rawData),
    amount: Number(paymentData.amount ?? fallbackAmount) || fallbackAmount,
    currency: paymentData.currency === "CDF" ? "CDF" : fallbackCurrency,
    phoneNumber,
    providerResponses: { collect: response as unknown },
  };
}

export async function collectMobileMoneyForCommande(input: {
  amount: number;
  currency: "USD" | "CDF";
  reference: string;
  phoneNumber: string;
}): Promise<{ response: PaymentResponse; transaction: CommandePaymentTransaction }> {
  const payload: CollectMobileMoneyPayload = {
    channel: "MOBILE_MONEY",
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    phone: input.phoneNumber,
  };
  const response = await runCollectWithLogging(payload);
  const data = response.data;
  if (data == null || typeof data !== "object") {
    throw new Error("Paiement refusé — réponse fournisseur invalide.");
  }
  const transaction = buildTransactionFromCollectResponse(
    response,
    input.phoneNumber,
    input.amount,
    input.currency
  );
  return { response, transaction };
}

/**
 * Vérifie le paiement auprès du fournisseur, met à jour `commande.status` et `transaction.providerResponses.lastCheck`.
 */
export async function syncCommandePaymentStatusFromProvider(
  commande: HydratedDocument<CommandeDoc>
): Promise<{ message: string; providerStatus: string | null; check: PaymentResponse | null }> {
  if (commande.status === "completed") {
    return { message: "Commande complétée.", providerStatus: null, check: null };
  }
  let orderNumber = normalizeString(commande.transaction?.orderNumber);
  if (!orderNumber) {
    const collectRaw = commande.transaction?.providerResponses?.collect;
    const fallback = extractFlexPayOrderKeyFromPayload(collectRaw);
    if (fallback) {
      orderNumber = fallback;
      commande.transaction = {
        ...commande.transaction,
        orderNumber: fallback,
      } as CommandeDoc["transaction"];
      await commande.save();
    }
  }
  if (!orderNumber) {
    return { message: "Aucun orderNumber.", providerStatus: null, check: null };
  }
  const check = await runCheckWithLogging(orderNumber);
  const providerStatus = extractTransactionStatusFromCheckResponse(check);
  const prevResponses = commande.transaction?.providerResponses ?? {};
  commande.transaction = {
    ...commande.transaction,
    providerResponses: {
      ...prevResponses,
      lastCheck: check as unknown,
    },
  } as CommandeDoc["transaction"];

  if (providerStatus != null) {
    const mapped = mapProviderTransactionToDeposit(providerStatus);
    commande.status = mapped;
    await commande.save();
    await syncRechargeStatusFromCommande(commande);
    if (mapped === "paid") {
      try {
        await createEtudiantOrderAfterMarketplacePaid(commande);
      } catch (e) {
        console.error("[commandePayment] création commande service étudiant:", e);
      }
      const updated = await CommandeModel.findById(commande._id);
      if (updated) {
        commande.transaction = updated.transaction;
        commande.status = updated.status;
      }
    }
  } else {
    await commande.save();
  }

  return { message: "Vérification paiement effectuée.", providerStatus, check };
}

/**
 * Crée ou met à jour une recharge liée à la commande lorsque l’étudiant existe en base (suivi admin / dépôts).
 */
export async function ensureRechargeForCommandeAfterCollect(
  commande: HydratedDocument<CommandeDoc>
): Promise<void> {
  const orderNumber = normalizeString(commande.transaction?.orderNumber);
  if (!orderNumber) return;

  const student = await userManager.getStudentByMatriculeAndEmail(
    commande.student.matricule,
    commande.student.email
  );
  if (!student) return;

  const commandeId = String(commande._id);
  const existing = await RechargeModel.findOne({ commandeId });
  if (!existing) {
    const doc = await userManager.createRechargeForStudentWithCommande(student._id, {
      commandeId,
      amount: commande.transaction.amount,
      currency: commande.transaction.currency,
      phoneNumber: commande.transaction.phoneNumber,
      orderNumber,
      status: "pending",
    });
    if (doc) {
      commande.rechargeId = String(doc._id);
      await commande.save();
    }
    return;
  }

  if (normalizeString(existing.orderNumber) !== orderNumber) {
    await userManager.setRechargeOrderNumber(existing._id, orderNumber);
  }
}

async function syncRechargeStatusFromCommande(commande: HydratedDocument<CommandeDoc>): Promise<void> {
  const commandeId = String(commande._id);
  const recharge = await RechargeModel.findOne({ commandeId });
  if (!recharge) return;
  if (commande.status === "paid") {
    await userManager.setRechargeStatus(recharge._id, "paid");
  } else if (commande.status === "failed") {
    await userManager.setRechargeStatus(recharge._id, "failed");
  }
}
