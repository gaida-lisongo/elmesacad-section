import { NextResponse } from "next/server";
import { loadFiliereStructureBySlug } from "@/lib/services/loadFiliereBySlug";

type RouteContext = { params: Promise<{ slug: string }> };

/** Lecture publique du parcours (filière → semestres → UE → matières) pour la page liste. */
export async function GET(_: Request, context: RouteContext) {
  try {
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw).trim();
    if (!slug) {
      return NextResponse.json({ message: "Slug requis" }, { status: 400 });
    }
    const doc = await loadFiliereStructureBySlug(slug);
    if (!doc) {
      return NextResponse.json({ message: "Filière introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Échec chargement filière", error: (error as Error).message },
      { status: 500 }
    );
  }
}
