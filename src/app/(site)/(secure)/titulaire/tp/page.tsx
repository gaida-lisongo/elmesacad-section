import type { Metadata } from "next";
import { loadTitulaireActivitesPageData } from "@/actions/titulaireActivites";
import TitulaireActivitesManagerClient from "../activites/TitulaireActivitesManagerClient";

export const metadata: Metadata = {
  title: "TP | INBTP",
};

export default async function TitulaireTpPage() {
  const { chargeTabs } = await loadTitulaireActivitesPageData();
  return <TitulaireActivitesManagerClient categorie="TP" chargeTabs={chargeTabs} />;
}
