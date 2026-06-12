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

  if (!success || !data || error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
        <p className="font-semibold">Accès réservé aux percepteurs.</p>
        <p className="mt-2">{error ?? "Aucun profil percepteur trouvé pour votre compte."}</p>
      </div>
    );
  }

  // IDs de toutes les commandes déjà attachées au(x) percepteur(s) de l'agent
  const commandesIds = data.perceptions.flatMap(
    (p: any) => p.commandes?.map((c: any) => c?._id?.toString?.() ?? String(c)) || []
  );

  // Ressources sélectionnables (une perception peut gérer plusieurs ressources)
  const resources = data.perceptions.flatMap((perception: any) =>
    (perception.ressources || []).map((r: any, idx: number) => ({
      id: `${perception._id?.toString?.() ?? perception._id}-${idx}`,
      perceptionId: perception._id?.toString?.() ?? perception._id,
      categorie: r.categorie,
      reference: r.reference,
      produit: r.produit,
    }))
  );

  return (
    <PerceptionClient
      agent={data.agent}
      resources={resources}
      commandesIds={commandesIds}
    />
  );
}
