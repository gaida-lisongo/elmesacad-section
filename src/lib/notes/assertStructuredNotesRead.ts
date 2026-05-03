import { connectDB } from "@/lib/services/connectedDB";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import userManager from "@/lib/services/UserManager";

/**
 * Organisateur : lecture de tout matricule demandé.
 * Étudiant : uniquement son propre matricule (document Mongo).
 */
export async function assertStructuredNotesRead(matricules: string[]): Promise<void> {
  const clean = [...new Set(matricules.map((m) => String(m ?? "").trim()).filter(Boolean))];
  if (clean.length === 0) {
    throw new Error("Matricule requis.");
  }

  const session = await getSessionPayload();
  if (!session) {
    throw new Error("Non authentifié.");
  }

  if (session.type === "Agent" && session.role === "organisateur") {
    return;
  }

  if (session.type === "Student") {
    await connectDB();
    const student = await userManager.getUserByEmail("Student", session.email);
    const own = String((student as { matricule?: string } | null)?.matricule ?? "").trim();
    if (!own) {
      throw new Error("Matricule étudiant introuvable.");
    }
    const ownL = own.toLowerCase();
    for (const m of clean) {
      if (m.toLowerCase() !== ownL) {
        throw new Error("Accès réservé à votre propre dossier.");
      }
    }
    return;
  }

  throw new Error("Accès réservé aux organisateurs ou à votre propre dossier.");
}
