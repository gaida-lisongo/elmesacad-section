import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

/**
 * Organisateur dont l’id JWT (`sub`) figure au bureau de la section (chef, chargé enseignement ou recherche).
 */
export async function gateOrganisateurSectionBureau(sectionId: string): Promise<
  | { ok: true; agentId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    return { ok: false, response: NextResponse.json({ message: "Non authentifié" }, { status: 401 }) };
  }
  if (session.role !== "organisateur") {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Accès réservé aux organisateurs (bureau de section)." },
        { status: 403 }
      ),
    };
  }
  if (!Types.ObjectId.isValid(session.sub) || !Types.ObjectId.isValid(sectionId)) {
    return { ok: false, response: NextResponse.json({ message: "Identifiant invalide" }, { status: 400 }) };
  }
  const agentId = session.sub;
  await connectDB();
  const section = await SectionModel.findById(sectionId).select("bureau").lean();
  if (!section) {
    return { ok: false, response: NextResponse.json({ message: "Section introuvable" }, { status: 404 }) };
  }
  const b = section.bureau;
  const bureauIds = [b?.chefSection, b?.chargeEnseignement, b?.chargeRecherche]
    .filter(Boolean)
    .map((id) => String(id));
  if (!bureauIds.includes(agentId)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "Vous n’êtes pas membre du bureau de cette section (chef de section, chargé d’enseignement ou chargé de recherche).",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true, agentId };
}
