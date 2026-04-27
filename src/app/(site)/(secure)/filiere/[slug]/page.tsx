import { notFound } from "next/navigation";
import { getSessionAgentCanManageFilieres } from "@/lib/auth/requireAdminManageFilieresApi";
import FiliereStructureClient, {
  type FiliereStructureInitial,
} from "@/components/filiere/FiliereStructureClient";
import { loadFiliereStructureBySlug } from "@/lib/services/loadFiliereBySlug";

type Props = { params: Promise<{ slug: string }> };

export default async function FiliereBySlugPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).trim();
  if (!slug) notFound();

  const doc = await loadFiliereStructureBySlug(slug);
  if (!doc) notFound();

  const initialData = JSON.parse(JSON.stringify(doc)) as FiliereStructureInitial;
  const canManageUnites = await getSessionAgentCanManageFilieres();

  return <FiliereStructureClient slug={slug} initialData={initialData} canManageUnites={canManageUnites} />;
}
