import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { uploadBtpAsset } from "@/lib/image/uploadBtpAsset";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    return NextResponse.json({ message: "Réservé aux gestionnaires" }, { status: 403 });
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
    return NextResponse.json({ message: "Format accepté : JPEG, PNG, WebP, GIF" }, { status: 400 });
  }

  const ext =
    (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? (file.type === "image/png" ? "png" : "jpg")).toLowerCase();
  const filename = `parcours-student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const schema = process.env.IMAGE_UPLOAD_SCHEMA ?? "profiles";

  try {
    const { publicUrl } = await uploadBtpAsset({ file, filename, schema });
    return NextResponse.json({ photo: publicUrl });
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message || "Upload impossible" },
      { status: 500 }
    );
  }
}
