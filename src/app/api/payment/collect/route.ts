import { NextResponse } from "next/server";
import type { CollectMobileMoneyPayload } from "@/lib/services/PaymentService";
import { runCollectWithLogging } from "@/lib/payment/paymentRun";

export async function OPTIONS() {
  return NextResponse.json(
    { ok: true },
    {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    }
  );
}

/**
 * Paiement collect : par défaut uniquement **mobile money** (canal MOBILE_MONEY).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const channel = (body.channel as string) ?? "MOBILE_MONEY";

    if (channel !== "MOBILE_MONEY") {
      return NextResponse.json(
        { success: false, error: "Seul le canal MOBILE_MONEY est pris en charge pour l’instant" },
        { status: 400 }
      );
    }

    const amount = body.amount;
    const currency = body.currency;
    const reference = body.reference;
    const phone = body.phone;

    if (typeof amount !== "number" && typeof amount !== "string") {
      return NextResponse.json(
        { success: false, error: "amount requis (nombre)" },
        { status: 400 }
      );
    }
    const amountNum = typeof amount === "string" ? Number.parseFloat(amount) : amount;
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ success: false, error: "amount invalide" }, { status: 400 });
    }

    if (currency !== "USD" && currency !== "CDF") {
      return NextResponse.json(
        { success: false, error: "currency requis: USD | CDF" },
        { status: 400 }
      );
    }

    if (typeof reference !== "string" || !reference.trim()) {
      return NextResponse.json(
        { success: false, error: "reference requise (ex. matricule/email#D0)" },
        { status: 400 }
      );
    }

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "phone requis pour le mobile money" },
        { status: 400 }
      );
    }

    const payload: CollectMobileMoneyPayload = {
      channel: "MOBILE_MONEY",
      amount: amountNum,
      currency,
      reference: reference.trim(),
      phone: phone.trim(),
    };

    const response = await runCollectWithLogging(payload);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur paiement",
      },
      { status: 500 }
    );
  }
}
