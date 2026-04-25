import { NextResponse } from "next/server";
import { runCheckWithLogging } from "@/lib/payment/paymentRun";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderNumber = url.searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json({ success: false, error: "orderNumber est requis" }, { status: 400 });
    }

    const response = await runCheckWithLogging(orderNumber);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur vérification paiement",
      },
      { status: 500 }
    );
  }
}
