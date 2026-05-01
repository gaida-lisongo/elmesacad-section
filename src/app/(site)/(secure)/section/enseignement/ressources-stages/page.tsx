import { redirect } from "next/navigation";

/** Ancien chemin — conservé pour les favoris et liens externes. */
export default function LegacyRessourcesStagesIndexRedirect() {
  redirect("/section/recherche/ressources-stages");
}
