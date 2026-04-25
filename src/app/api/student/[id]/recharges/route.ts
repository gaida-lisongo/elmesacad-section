import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Liste paginée des recharges (dépôts) d'un étudiant : filtre par statut de paiement,
 * recherche par orderNumber, téléphone ou montant.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id: studentId } = await context.params;
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const status = (url.searchParams.get("status") ?? "all") as
      | "all"
      | "pending"
      | "paid"
      | "failed";
    const search = url.searchParams.get("search") ?? "";

    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const exists = await userManager.getStudentById(studentId);
    if (!exists) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const { items, total } = await userManager.getRechargesPaginated({
      studentId,
      offset: safeOffset,
      limit: safeLimit,
      status,
      search,
    });

    return NextResponse.json(
      {
        data: items,
        pagination: {
          offset: safeOffset,
          limit: safeLimit,
          total,
          hasMore: safeOffset + items.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list recharges", error: (error as Error).message },
      { status: 500 }
    );
  }
}
