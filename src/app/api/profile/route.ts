import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";
import { canEditSensitiveFields, getSessionPayload } from "@/lib/auth/sessionServer";
import type { UserType } from "@/lib/services/UserManager";
import { Types } from "mongoose";

function serializeDoc(doc: unknown) {
  if (doc == null) {
    return {};
  }
  const o = doc as { toObject?: () => Record<string, unknown> } & Record<string, unknown>;
  const raw = "toObject" in o && typeof o.toObject === "function" ? o.toObject() : { ...o };
  if (raw._id) {
    raw._id = String(raw._id);
  }
  if (raw.dateDeNaissance instanceof Date) {
    raw.dateDeNaissance = raw.dateDeNaissance.toISOString();
  }
  if (Array.isArray(raw.authorizations)) {
    delete raw.authorizations;
  }
  return raw;
}

/**
 * Profil courant (session) pour édition.
 */
export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  try {
    await connectDB();
    const user = await userManager.getUserByEmail(session.type, session.email);
    if (!user) {
      return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      profile: serializeDoc(user),
      canEditSensitive: canEditSensitiveFields(session),
    });
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

type PutBody = {
  name?: string;
  sexe?: "M" | "F";
  dateDeNaissance?: string;
  lieuDeNaissance?: string;
  nationalite?: string;
  ville?: string;
  adresse?: string;
  telephone?: string;
  photo?: string;
  email?: string;
  matricule?: string;
};

/**
 * Mise à jour profil. E-mail / matricule seulement si `canEditSensitive` (admin agent).
 */
export async function PUT(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  const body = (await request.json()) as PutBody;
  const sensitive = canEditSensitiveFields(session);
  if ((body.email !== undefined || body.matricule !== undefined) && !sensitive) {
    return NextResponse.json(
      { message: "Seuls les administrateurs peuvent modifier l’e-mail ou le matricule." },
      { status: 403 }
    );
  }
  try {
    await connectDB();
    const user = await userManager.getUserByEmail(session.type, session.email);
    if (!user) {
      return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
    }
    const id = (user as { _id: Types.ObjectId })._id;

    const payload: Record<string, unknown> = {};
    if (body.name != null) {
      payload.name = body.name;
    }
    if (body.sexe != null) {
      payload.sexe = body.sexe;
    }
    if (body.dateDeNaissance != null) {
      payload.dateDeNaissance = new Date(body.dateDeNaissance);
    }
    if (body.lieuDeNaissance != null) {
      payload.lieuDeNaissance = body.lieuDeNaissance;
    }
    if (body.nationalite != null) {
      payload.nationalite = body.nationalite;
    }
    if (body.ville != null) {
      payload.ville = body.ville;
    }
    if (body.adresse != null) {
      payload.adresse = body.adresse;
    }
    if (body.telephone != null) {
      payload.telephone = body.telephone;
    }
    if (body.photo != null) {
      payload.photo = body.photo;
    }
    if (sensitive) {
      if (body.email != null) {
        payload.email = body.email;
      }
      if (body.matricule != null) {
        payload.matricule = body.matricule;
      }
    }

    const type: UserType = session.type;
    if (type === "Student") {
      const next = await userManager.updateStudent(String(id), payload);
      if (!next) {
        return NextResponse.json({ message: "Mise à jour impossible" }, { status: 500 });
      }
      return NextResponse.json({ profile: serializeDoc(next) });
    }
    const next = await userManager.updateAgent(String(id), payload);
    if (!next) {
      return NextResponse.json({ message: "Mise à jour impossible" }, { status: 500 });
    }
    return NextResponse.json({ profile: serializeDoc(next) });
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
