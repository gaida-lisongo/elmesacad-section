import type { Metadata } from "next";
import PageDetail from "@/components/secure/PageDetail";
import { listPresencesForSeance } from "@/actions/titulairePresences";
import TitulairePresenceDetailClient from "./TitulairePresenceDetailClient";

type Props = {
  params: Promise<{ seanceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Feuille de présences | INBTP",
};

export default async function TitulairePresenceSeancePage({ params, searchParams }: Props) {
  const { seanceId } = await params;
  const sp = await searchParams;
  const q = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
  };
  const rows = await listPresencesForSeance(seanceId);
  const data = {
    seance: {
      id: seanceId,
      label: q("label") || "Séance",
      dateSeance: q("date"),
      jour: q("jour"),
      heureDebut: q("heureDebut"),
      heureFin: q("heureFin"),
      salle: q("salle"),
      lecon: q("label") || "Séance",
      chargeId: "",
    },
    rows,
  };

  const Card = () => <TitulairePresenceDetailClient initialData={data} />;

  return (
    <PageDetail
      title={`Présences — ${data.seance.label}`}
      description="Présences remontées par le service titulaire via /presences/seance/:seanceId."
      breadcrumbs={[
        { href: "/", text: "Accueil" },
        { href: "/titulaire/presences", text: "Présences" },
        { href: `/titulaire/presences/${seanceId}`, text: data.seance.label },
      ]}
      CardDetail={Card}
    />
  );
}
