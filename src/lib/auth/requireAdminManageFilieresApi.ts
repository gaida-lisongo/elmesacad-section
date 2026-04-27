import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mapDbUserToAuthUser } from "@/lib/auth/mapToAuthUser";
import type { AuthUserAgent } from "@/lib/auth/types";
import { resolveAdminCapabilities } from "@/lib/dashboard/adminCapabilitiesFromAuthorizations";
import type { DashboardRole } from "@/lib/dashboard/types";
import { authManager } from "@/lib/services/AuthManager";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";

const COOKIE = "auth_session";

function agentRoleToDashboardRole(role: string): DashboardRole {
  if (role === "admin" || role === "titulaire" || role === "organisateur" || role === "gestionnaire") {
    return role;
  }
  return "titulaire";
}

/**
 * Admin agent avec droit SA (filières), aligné sur `resolveAdminCapabilities`.
 */
export async function requireAdminManageFilieres(): Promise<AuthUserAgent | NextResponse> {
  await connectDB();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  let payload: { type: string; email: string };
  try {
    payload = (await authManager.verifySession(token)) as { type: string; email: string };
  } catch {
    return NextResponse.json({ message: "Session invalide" }, { status: 401 });
  }
  if (payload.type !== "Agent") {
    return NextResponse.json({ message: "Accès réservé aux agents" }, { status: 403 });
  }
  const user = await userManager.getUserByEmail("Agent", payload.email);
  if (!user) {
    return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 401 });
  }
  const authUser = mapDbUserToAuthUser(user, "Agent");
  if (authUser.kind !== "agent") {
    return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
  }
  const dashRole = agentRoleToDashboardRole(authUser.role);
  const caps = resolveAdminCapabilities(dashRole, authUser.authorizations ?? []);
  if (!caps.canManageFilieres) {
    return NextResponse.json(
      { message: "Habilitation SA (filières) requise pour cette action" },
      { status: 403 }
    );
  }
  return authUser;
}

export async function getSessionAgentCanManageFilieres(): Promise<boolean> {
  try {
    const r = await requireAdminManageFilieres();
    return !(r instanceof NextResponse);
  } catch {
    return false;
  }
}
