import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { uploadBtpAsset } from "@/lib/image/uploadBtpAsset";
import { Types } from "mongoose";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ message: "Fichier trop volumineux (max 8 Mo)" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { message: "Format accepté : JPEG, PNG, WebP, GIF" },
      { status: 400 }
    );
  }

  const ext =
    (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? (file.type === "image/png" ? "png" : "jpg")).toLowerCase();
  const filename = `avatar-${String(session.sub).replace(/[^a-zA-Z0-9-_]/g, "")}-${Date.now()}.${ext}`;

  try {
    const { publicUrl } = await uploadBtpAsset({ file, filename });
    await connectDB();
    const user = await userManager.getUserByEmail(session.type, session.email);
    if (!user) {
      return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
    }
    const id = (user as { _id: Types.ObjectId })._id;
    if (session.type === "Student") {
      const next = await userManager.updateStudent(String(id), { photo: publicUrl });
      if (!next) {
        return NextResponse.json({ message: "Mise à jour photo impossible" }, { status: 500 });
      }
    } else {
      const next = await userManager.updateAgent(String(id), { photo: publicUrl });
      if (!next) {
        return NextResponse.json({ message: "Mise à jour photo impossible" }, { status: 500 });
      }
    }
    return NextResponse.json({ photo: publicUrl });
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message || "Upload impossible" },
      { status: 500 }
    );
  }
}
