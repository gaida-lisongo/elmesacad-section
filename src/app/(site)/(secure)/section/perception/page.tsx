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

  const { success, data, error } = await getMyPercepteur();

  console.log("Résultat de getMyPercepteur:", { success, data, error });

  if (!success || !data || error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
        <p className="font-semibold">Accès réservé aux percepteurs.</p>
        <p className="mt-2">{error ?? "Aucun profil percepteur trouvé pour votre compte."}</p>
      </div>
    );
  }

  // Transforme les perceptions en ressources sélectionnables.
  // Chaque perception peut gérer plusieurs ressources.
  const resources = data.perceptions.flatMap((perception: any) =>
    (perception.ressources || []).map((r: any, idx: number) => ({
      id: `${perception._id?.toString?.() ?? perception._id}-${idx}`,
      perceptionId: perception._id?.toString?.() ?? perception._id,
      categorie: r.categorie,
      reference: r.reference,
      produit: r.produit,
      commandes: perception.commandes || [],
    }))
  );

  // Agrégats globaux
  const globalMetrics = {
    tCommandes: data.allCommandes.length,
    amountCollected: data.allCommandes.reduce(
      (sum: number, cmd: any) => sum + (cmd.transaction?.amount ?? 0),
      0
    ),
    tRessources: resources.length,
  };

  return (
    <PerceptionClient
      agent={data.agent}
      resources={resources}
      allCommandes={data.allCommandes}
      globalMetrics={globalMetrics}
    />
  );
}
