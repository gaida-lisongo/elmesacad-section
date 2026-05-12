import { getLaboratoireBySlug } from "@/actions/laboratoireActions";
import { connectDB } from "@/lib/services/connectedDB";
import { EquipementModel } from "@/lib/models/Equipement";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { Icon } from "@iconify/react";
import EquipmentCard from "@/components/laboratoire/EquipmentCard";
import Image from "next/image";
import LaboratoireClient from "./LaboratoireClient";
import { canEditLaboratoire, getUserTechnicienFonction } from "@/lib/auth/laboAuth";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const labo = await getLaboratoireBySlug(slug);
  return {
    title: labo ? `${labo.nom} | INBTP` : "Laboratoire | INBTP",
  };
}

export default async function LaboratoirePublicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  await connectDB();
  const labo = await getLaboratoireBySlug(slug);
  
  if (!labo) {
    notFound();
  }

  const equipments = await EquipementModel.find({ laboratoire: labo._id }).lean();

  // Vérifier si l'utilisateur connecté peut éditer ce laboratoire
  const [canEdit, userFonction] = await Promise.all([
    canEditLaboratoire(labo),
    getUserTechnicienFonction(labo),
  ]);

  return (
    <>
      <LaboratoireClient canEdit={canEdit} userFonction={userFonction} labo={labo} />
    </>
  );
}
