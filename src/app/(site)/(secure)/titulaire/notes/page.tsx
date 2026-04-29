import type { Metadata } from "next";
import { loadTitulaireNotesManagerData } from "@/actions/titulaireNotesWorkflow";
import TitulaireNotesManagerClient from "./TitulaireNotesManagerClient";

export const metadata: Metadata = {
  title: "Fiche de cotation | INBTP",
};

export default async function TitulaireNotesPage() {
  const data = await loadTitulaireNotesManagerData();
  return <TitulaireNotesManagerClient initialData={data} />;
}

