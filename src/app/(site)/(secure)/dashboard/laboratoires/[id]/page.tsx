import { getLaboratoireById } from "@/actions/laboratoireActions";
import { connectDB } from "@/lib/services/connectedDB";
import { EquipementModel } from "@/lib/models/Equipement";
import { ManipulationModel } from "@/lib/models/Manipulation";
import { notFound } from "next/navigation";
import PageDetail from "@/components/secure/PageDetail";
import LaboratoireDetailCard from "../_components/LaboratoireDetailCard";
import { getSessionPayload } from "@/lib/auth/sessionServer";

export default async function LaboratoireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionPayload();
  
  await connectDB();
  const labo = await getLaboratoireById(id);
  
  if (!labo) {
    notFound();
  }

  const equipments = await EquipementModel.find({ laboratoire: id }).lean();
  const manipulations = await ManipulationModel.find({ laboratoire: id })
    .populate("etudiantsInscrits.etudiant", "name email")
    .lean();

  const Card = () => (
    <LaboratoireDetailCard 
      labo={labo} 
      equipments={JSON.parse(JSON.stringify(equipments))} 
      manipulations={JSON.parse(JSON.stringify(manipulations))}
      session={session}
    />
  );

  return (
    <PageDetail
      title={labo.nom}
      description={`Visualisation détaillée du laboratoire ${labo.nom}`}
      breadcrumbs={[
        { href: "/dashboard", text: "Dashboard" },
        { href: "/dashboard/laboratoires", text: "Laboratoires" },
        { href: `/dashboard/laboratoires/${labo._id}`, text: labo.nom },
      ]}
      CardDetail={Card}
    />
  );
}
