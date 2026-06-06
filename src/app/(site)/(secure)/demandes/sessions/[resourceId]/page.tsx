import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { getGestionnaireSessionResourceAction } from "@/actions/gestionnaireSessionResources";
import { CommandeModel } from "@/lib/models/Commande";
import SessionOrdersClient from "./SessionOrdersClient";

export const metadata: Metadata = {
  title: "Demandes - Session | INBTP",
};

type PageProps = { params: Promise<{ resourceId: string }> };

export default async function DemandesSessionCommandesPage({ params }: PageProps) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) redirect("/dashboard");

  const { resourceId } = await params;
  const rid = String(resourceId ?? "").trim();
  if (!rid) redirect("/demandes");

  // Récupérer la désignation de la session
  let designation = rid;
  try {
    const detail = await getGestionnaireSessionResourceAction({ sectionSlug: scope.sectionSlug, id: rid });
    designation = detail.designation || rid;
  } catch {
    // On garde le rid comme fallback
  }

  // Récupérer les commandes depuis MongoDB (côté serveur)
  const commandes = await CommandeModel.find({
    "ressource.categorie": "SESSION",
    "ressource.reference": rid,
  }).lean();

  const orders = commandes.map((c: any) => ({
    _id: c._id.toString(),
    student: {
      nom: c?.ressource?.metadata?.fullName ?? "N/A",
      matricule: c?.student?.matricule ?? "N/A",
      email: c?.student?.email ?? "N/A",
    },
    transaction: {
      _id: c?.transaction?.providerResponses?._id?.$_oid ?? "N/A",
      categorie: c?.ressource?.categorie ?? "N/A",
      orderNumber: c?.transaction?.orderNumber ?? "N/A",
      amount: c?.transaction?.amount ?? 0,
      currency: c?.transaction?.currency ?? "N/A",
      phoneNumber: c?.transaction?.phoneNumber ?? "N/A",
      providerInfo: c?.transaction?.providerResponses?.lastCheck?.message ?? "N/A",
    },
    status: c.status,
    createdAt: c.createdAt,
    rechargeId: c.rechargeId,
  }));

  return (
    <SessionOrdersClient
      orders={orders}
      designation={designation}
      resourceId={rid}
    />
  );
}
