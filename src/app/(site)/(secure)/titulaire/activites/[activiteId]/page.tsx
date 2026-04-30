import type { Metadata } from "next";
import PageDetail from "@/components/secure/PageDetail";
import { listResolutionsForActivite } from "@/actions/titulaireActivites";
import TitulaireResolutionsDetailClient from "./TitulaireResolutionsDetailClient";

type Props = {
  params: Promise<{ activiteId: string }>;
};

export const metadata: Metadata = {
  title: "Résolutions activité | INBTP",
};

export default async function TitulaireActiviteResolutionsPage({ params }: Props) {
  const { activiteId } = await params;
  const rows = await listResolutionsForActivite(activiteId);
  const Card = () => <TitulaireResolutionsDetailClient activiteId={activiteId} rows={rows} />;

  return (
    <PageDetail
      title="Résolutions soumises"
      description="Consultation des soumissions étudiantes pour une activité (TP/QCM)."
      breadcrumbs={[
        { href: "/", text: "Accueil" },
        { href: "/titulaire/tp", text: "TP" },
        { href: `/titulaire/activites/${activiteId}`, text: "Résolutions" },
      ]}
      CardDetail={Card}
    />
  );
}
