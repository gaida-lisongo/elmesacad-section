import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { getMyPercepteur } from "@/actions/perceptionActions";
import PerceptionClient from "./PerceptionClent";

export const metadata: Metadata = {
  title: "Perception | INBTP",
};

export default async function PerceptionPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    redirect("/dashboard");
  }

  await connectDB();

  // Récupérer le percepteur lié à l'agent connecté
  const result = await getMyPercepteur();

  if (!result.success || !result.data) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
        <p className="font-semibold">Accès réservé aux percepteurs.</p>
        <p className="mt-2">{result.error ?? "Aucun profil percepteur trouvé pour votre compte."}</p>
      </div>
    );
  }

  const percepteur = result.data;

  // Construire les ressources à partir des ressources du percepteur
  const resources = percepteur.ressources.map((r) => ({
    id: r.reference,
    categorie: r.categorie,
    produit: r.produit,
  }));

  return (
    <PerceptionClient
      percepteur={percepteur}
      resources={resources}
    />
  );
}