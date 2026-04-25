import { NextResponse } from "next/server";
import { canEditSensitiveFields, getSessionPayload } from "@/lib/auth/sessionServer";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";

/**
 * Liste toutes les recharges (jointe à l’étudiant). Réservé à l’admin.
 * Query : `page`, `limit`, `status` (all|pending|paid|failed), `search`
 */
export async function GET(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canEditSensitiveFields(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20));
  const offset = page * limit;
  const statusQ = searchParams.get("status") ?? "all";
  const status =
    statusQ === "pending" || statusQ === "paid" || statusQ === "failed"
      ? (statusQ as "pending" | "paid" | "failed")
      : "all";
  const search = searchParams.get("search") ?? "";

  try {
    await connectDB();
    const { items, total } = await userManager.getAllRechargesPaginated({
      offset,
      limit,
      status,
      search,
    });
    return NextResponse.json({ data: items, total, page, limit });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
