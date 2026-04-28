import { cookies } from "next/headers";
import { authManager } from "@/lib/services/AuthManager";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";

const COOKIE = "auth_session";

export type SessionPayload = {
  sub: string;
  email: string;
  type: "Agent" | "Student";
  role?: string;
  name?: string;
};

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    return (await authManager.verifySession(token)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  return token?.trim() || null;
}

export async function refreshSessionJwtFromDb(): Promise<{ token: string } | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const payload = (await authManager.verifySession(token)) as SessionPayload;
    await connectDB();
    const user = await userManager.getUserByEmail(payload.type, payload.email);
    if (!user) return null;
    const renewed = await authManager.createSessionToken(payload);
    return { token: renewed };
  } catch {
    return null;
  }
}

/** Seuls les agents avec rôle `admin` peuvent modifier e-mail / matricule. */
export function canEditSensitiveFields(payload: SessionPayload): boolean {
  return payload.type === "Agent" && payload.role === "admin";
}

export function isAgentSession(
  p: SessionPayload | null
): p is SessionPayload & { type: "Agent" } {
  return p != null && p.type === "Agent";
}

/** Tout agent connecté peut gérer les tickets support. */
export function canManageSupportTickets(
  p: SessionPayload | null
): p is SessionPayload & { type: "Agent" } {
  return isAgentSession(p);
}
