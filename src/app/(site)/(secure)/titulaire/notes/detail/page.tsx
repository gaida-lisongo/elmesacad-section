import type { Metadata } from "next";
import TitulaireNotesDetailClient from "./TitulaireNotesDetailClient";

export const metadata: Metadata = {
  title: "Fiche de cotation - Détail | INBTP",
};

type Props = {
  searchParams?: Promise<{
    anneeSlug?: string;
    programmeRef?: string;
    matiereRef?: string;
    cacheKey?: string;
  }>;
};

export default async function TitulaireNotesDetailPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  return (
    <TitulaireNotesDetailClient
      anneeSlug={String(sp.anneeSlug ?? "")}
      programmeRef={String(sp.programmeRef ?? "")}
      matiereRef={String(sp.matiereRef ?? "")}
      cacheKey={String(sp.cacheKey ?? "")}
    />
  );
}

