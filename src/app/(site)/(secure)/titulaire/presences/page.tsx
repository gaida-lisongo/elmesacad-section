import type { Metadata } from "next";
import { loadTitulairePresencesPageData } from "@/actions/titulairePresences";
import TitulairePresencesClient from "./TitulairePresencesClient";

export const metadata: Metadata = {
  title: "Présences | INBTP",
};

export default async function TitulairePresencesPage() {
  const { chargeTabs } = await loadTitulairePresencesPageData();
  return <TitulairePresencesClient chargeTabs={chargeTabs} />;
}
