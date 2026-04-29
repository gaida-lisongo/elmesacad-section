import type { Metadata } from "next";
import { loadTitulaireDescripteursData } from "@/actions/titulaireDescripteurs";
import TitulaireDescripteursClient from "./TitulaireDescripteursClient";

export const metadata: Metadata = {
  title: "Descripteurs | INBTP",
};

export default async function TitulaireDescripteursPage() {
  const data = await loadTitulaireDescripteursData();
  return <TitulaireDescripteursClient initialData={data} />;
}

