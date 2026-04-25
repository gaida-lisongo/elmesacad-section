import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import { runCheckWithLogging } from "@/lib/payment/paymentRun";
import {
  extractTransactionStatusFromCheckResponse,
  mapProviderTransactionToDeposit,
} from "@/lib/payment/transactionStatus";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Body = { rechargeId: string };

/**
 * Check statut fournisseur et mise à jour du statut de la recharge.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id: studentId } = await context.params;
    const body = (await request.json()) as Body;
    if (!body.rechargeId || typeof body.rechargeId !== "string") {
      return NextResponse.json({ success: false, error: "rechargeId requis" }, { status: 400 });
    }

    const recharge = await userManager.getRechargeByIdForStudent(body.rechargeId, studentId);
    if (!recharge) {
      return NextResponse.json({ success: false, error: "Recharge not found" }, { status: 404 });
    }
    if (!recharge.orderNumber || String(recharge.orderNumber).trim() === "") {
      return NextResponse.json(
        { success: false, error: "Aucun orderNumber — lancer d’abord le paiement" },
        { status: 400 }
      );
    }

    const orderNumber = String(recharge.orderNumber).trim();

    console.log(
      "[api/student/.../deposits/credit] check orderNumber =",
      orderNumber,
      "| studentId =",
      studentId,
      "| rechargeId =",
      body.rechargeId
    );

    const check = await runCheckWithLogging(orderNumber);

    const providerStatus = extractTransactionStatusFromCheckResponse(check);
    let depositStatus: "pending" | "paid" | "failed" | null = null;
    if (providerStatus != null) {
      depositStatus = mapProviderTransactionToDeposit(providerStatus);
      await userManager.setRechargeStatus(recharge._id, depositStatus);
    } else {
      console.warn(
        "[api/student/.../deposits/credit] transaction.status introuvable, recharge inchangée:",
        JSON.stringify(check, null, 2)
      );
    }

    return NextResponse.json(
      {
        success: check.success,
        check,
        orderNumber,
        studentId,
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
