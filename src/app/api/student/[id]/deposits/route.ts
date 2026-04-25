import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Body = {
  amount: number;
  currency: "USD" | "CDF";
  phoneNumber: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = (await request.json()) as Body;

    if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }
    if (body.currency !== "USD" && body.currency !== "CDF") {
      return NextResponse.json({ message: "Invalid currency" }, { status: 400 });
    }
    if (!body.phoneNumber || String(body.phoneNumber).trim().length < 6) {
      return NextResponse.json({ message: "Invalid phone number" }, { status: 400 });
    }

    const recharge = await userManager.addStudentDeposit(id, {
      amount: body.amount,
      currency: body.currency,
      phoneNumber: String(body.phoneNumber).trim(),
    });
    if (!recharge) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        data: {
          recharge: {
            id: String(recharge._id),
            orderNumber: recharge.orderNumber,
            amount: recharge.amount,
            currency: recharge.currency,
            phoneNumber: recharge.phoneNumber,
            status: recharge.status,
            createdAt: recharge.createdAt?.toISOString?.() ?? new Date().toISOString(),
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to add deposit", error: (error as Error).message },
      { status: 500 }
    );
  }
}
