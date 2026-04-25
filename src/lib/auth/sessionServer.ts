import { cookies } from "next/headers";
import { authManager } from "@/lib/services/AuthManager";

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

/** Seuls les agents avec rôle `admin` peuvent modifier e-mail / matricule. */
export function canEditSensitiveFields(payload: SessionPayload): boolean {
  return payload.type === "Agent" && payload.role === "admin";
}
