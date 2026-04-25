import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import { runCollectWithLogging } from "@/lib/payment/paymentRun";
import { buildStudentDepositReference } from "@/lib/payment/studentReference";
import { extractOrderNumberFromProviderPayload } from "@/lib/payment/extractOrderNumber";
import type { CollectMobileMoneyPayload } from "@/lib/services/PaymentService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Body = {
  /** Identifiant MongoDB de la recharge (collection `recharges`) */
  rechargeId: string;
};

/**
 * Initie le collect mobile money. Persiste l’`orderNumber` sur la recharge.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id: studentId } = await context.params;
    const body = (await request.json()) as Body;
    if (!body.rechargeId || typeof body.rechargeId !== "string") {
      return NextResponse.json({ message: "rechargeId requis" }, { status: 400 });
    }

    const student = await userManager.getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const recharge = await userManager.getRechargeByIdForStudent(body.rechargeId, studentId);
    if (!recharge) {
      return NextResponse.json({ message: "Recharge not found" }, { status: 404 });
    }

    if (recharge.orderNumber) {
      return NextResponse.json(
        {
          success: true,
          message: "Order already created",
          collect: null,
          data: { orderNumber: recharge.orderNumber },
          reference: buildStudentDepositReference(
            student.matricule,
            student.email,
            String(recharge._id)
          ),
          studentId,
          rechargeId: String(recharge._id),
        },
        { status: 200 }
      );
    }

    const reference = buildStudentDepositReference(
      student.matricule,
      student.email,
      String(recharge._id)
    );

    const payload: CollectMobileMoneyPayload = {
      channel: "MOBILE_MONEY",
      amount: recharge.amount,
      currency: recharge.currency,
      reference,
      phone: recharge.phoneNumber,
    };

    const collect = await runCollectWithLogging(payload);

    const orderNumber = extractOrderNumberFromProviderPayload(collect);
    if (orderNumber) {
      await userManager.setRechargeOrderNumber(recharge._id, orderNumber);
    } else {
      console.warn(
        "[api/student/.../deposits/payment] orderNumber introuvable dans la réponse collect:",
        JSON.stringify(collect, null, 2)
      );
    }

    return NextResponse.json(
      {
        success: collect.success && Boolean(orderNumber),
        message: orderNumber
          ? collect.message
          : (collect.message ?? "Collecte ok mais orderNumber non extrait"),
        orderNumber: orderNumber ?? null,
        collect,
        reference,
        studentId,
        rechargeId: String(recharge._id),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Collecte paiement échouée",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
