import type { Metadata } from "next";
import { loadTitulaireActivitesPageData } from "@/actions/titulaireActivites";
import TitulaireActivitesManagerClient from "../activites/TitulaireActivitesManagerClient";

export const metadata: Metadata = {
  title: "QCM | INBTP",
};

export default async function TitulaireQcmPage() {
  const { chargeTabs } = await loadTitulaireActivitesPageData();
  return <TitulaireActivitesManagerClient categorie="QCM" chargeTabs={chargeTabs} />;
}
