import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicUniteById } from "@/actions/publicUnites";
import Breadcrumb from "@/components/Common/Breadcrumb";
import UniteClient from "./UniteClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const unite = await getPublicUniteById(id);

  return {
    title: `${unite?.code || "UE"} - ${unite?.designation || "Unité d\'enseignement"} | INBTP`,
    description: unite?.description || "Détails de l'unité d'enseignement",
  };
}

export default async function UniteDetailPage({ params }: Props) {
  const { id } = await params;
  const unite = await getPublicUniteById(id);

  if (!unite) {
    notFound();
  }

  console.log("UniteDetailPage: unite", unite);

  return (
    <>
      <Breadcrumb
        pageName={unite.code}
        pageDescription={unite.designation}
        trail={[
          { label: "Études", href: "/etudes" },
          { label: "Unités d\'enseignement", href: "/unite" },
        ]}
      />
      <UniteClient unite={unite} />

    </>
  );
}
