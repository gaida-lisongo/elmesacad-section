import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ resourceId: string }> };

/** Ancien chemin — conservé pour les favoris et liens externes. */
export default async function LegacyStageCommandesRedirect({ params }: PageProps) {
  const { resourceId } = await params;
  const rid = String(resourceId ?? "").trim();
  if (!rid) redirect("/section/recherche/ressources-stages");
  redirect(`/section/recherche/ressources-stages/stages/${encodeURIComponent(rid)}`);
}
