import { NextResponse } from "next/server";
import { canEditSensitiveFields, getSessionPayload } from "@/lib/auth/sessionServer";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
export async function GET(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canEditSensitiveFields(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const userType = (searchParams.get("userType") ?? "Student") as "Student" | "Agent";
  const statusQ = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "10") || 10));
  const offset = page * limit;

  const status =
    statusQ === "active" || statusQ === "inactive" ? (statusQ as "active" | "inactive") : undefined;

  try {
    await connectDB();
    if (userType === "Agent") {
      const [rows, total] = await Promise.all([
        userManager.getAgentsPaginated({ search, offset, limit, status, role: undefined }),
        userManager.countAgents({ search, status }),
      ]);
      const tableRows = rows.map((u) => ({
        id: u.id,
        columns: [u.name, u.email, u.matricule, u.status, `Agent (${u.role})`],
      }));
      return NextResponse.json({ data: tableRows, total, page, limit });
    }
    const [rows, total] = await Promise.all([
      userManager.getStudentsList({ search, offset, limit, status }),
      userManager.countStudents({ search, status }),
    ]);
    const tableRows = rows.map((u) => ({
      id: u.id,
      columns: [u.name, u.email, u.matricule, u.status, "Étudiant"],
    }));
    return NextResponse.json({ data: tableRows, total, page, limit });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
