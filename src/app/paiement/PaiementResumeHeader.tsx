import Link from "next/link";
import type { PaiementPageHydration } from "@/app/paiement/_components/commandeResumePayload";

type Props = {
  commandeId: string;
  hydration: PaiementPageHydration;
  /** Phase métier : pas d’étudiant ni de résumé produit ici (affichés dans le client métier). */
  variant?: "default" | "metier";
};

/** En-tête commun — en phase métier, seulement retour + identifiant commande. */
export default function PaiementResumeHeader({ commandeId, hydration, variant = "default" }: Props) {
  const minimal = variant === "metier";

  return (
    <>
      <Link
        href="/etudes"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <span aria-hidden className="text-lg">
          ←
        </span>
        Retour aux études
      </Link>
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
        Identifiant : <span className="font-mono text-xs">{commandeId}</span>
      </p>

      {!minimal && hydration.etudiantLocal ? (
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          Étudiant :{" "}
          <span className="font-medium text-midnight_text dark:text-white">
            {hydration.etudiantLocal.name}
          </span>{" "}
          <span className="text-slate-500 dark:text-slate-400">
            ({hydration.etudiantLocal.matricule})
          </span>
        </p>
      ) : null}

      {!minimal && hydration.produit?.kind === "ressource" ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Produit :{" "}
          <span className="font-medium text-midnight_text dark:text-white">
            {hydration.produit.designation}
          </span>
          {hydration.produit.section.section ? (
            <span className="text-slate-500 dark:text-slate-400">
              {" "}
              — Section {hydration.produit.section.section}
            </span>
          ) : null}
        </p>
      ) : !minimal && hydration.produit?.kind === "activite" ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Activité {hydration.produit.categorie} (réf.{" "}
          <span className="font-mono text-xs">{hydration.produit.id}</span>)
        </p>
      ) : !minimal && hydration.produitError ? (
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{hydration.produitError}</p>
      ) : null}
    </>
  );
}
