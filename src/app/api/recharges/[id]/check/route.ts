import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { canEditSensitiveFields, getSessionPayload } from "@/lib/auth/sessionServer";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import { runCheckWithLogging } from "@/lib/payment/paymentRun";
import {
  extractTransactionStatusFromCheckResponse,
  mapProviderTransactionToDeposit,
} from "@/lib/payment/transactionStatus";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Vérifie le paiement auprès du fournisseur (orderNumber) et met à jour le statut de la recharge.
 * Même logique que POST /api/student/[id]/deposits/credit, mais accessible à l’admin pour toute recharge.
 */
export async function POST(_request: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 });
  }
  if (!canEditSensitiveFields(session)) {
    return NextResponse.json({ success: false, error: "Réservé aux administrateurs" }, { status: 403 });
  }

  const { id: rechargeId } = await context.params;
  if (!Types.ObjectId.isValid(rechargeId)) {
    return NextResponse.json({ success: false, error: "id invalide" }, { status: 400 });
  }

  try {
    await connectDB();
    const recharge = await userManager.getRechargeById(rechargeId);
    if (!recharge) {
      return NextResponse.json({ success: false, error: "Recharge introuvable" }, { status: 404 });
    }
    if (!recharge.orderNumber || String(recharge.orderNumber).trim() === "") {
      return NextResponse.json(
        { success: false, error: "Aucun orderNumber — paiement non initié pour cette recharge" },
        { status: 400 }
      );
    }

    const orderNumber = String(recharge.orderNumber).trim();
    const check = await runCheckWithLogging(orderNumber);

    const providerStatus = extractTransactionStatusFromCheckResponse(check);
    let depositStatus: "pending" | "paid" | "failed" | null = null;
    if (providerStatus != null) {
      depositStatus = mapProviderTransactionToDeposit(providerStatus);
      await userManager.setRechargeStatus(recharge._id, depositStatus);
    }

    return NextResponse.json(
      {
        success: check.success,
        check,
        orderNumber,
        studentId: String(recharge.studentId),
        rechargeId: String(recharge._id),
        providerStatus,
        depositStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Vérification échouée",
      },
      { status: 500 }
    );
  }
}
