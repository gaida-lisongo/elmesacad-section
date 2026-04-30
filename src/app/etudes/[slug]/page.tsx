import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSectionBySlug } from "@/actions/publicSections";
import FacultyHeader from "@/components/Etudes/FacultyHeader";
import SectionDetailContent from "@/components/Etudes/SectionDetailContent";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const section = await getPublicSectionBySlug(slug);
  return {
    title: section ? `${section.name} | Etudes INBTP` : "Section | Etudes INBTP",
  };
}

export default async function EtudesSectionPage({ params }: Props) {
  const { slug } = await params;
  const section = await getPublicSectionBySlug(slug);

  if (!section) notFound();

  return (
    <>
      <FacultyHeader
        facultyName={section.name}
        facultyTagline="Recherchez un cours au sein de cette faculte ou consultez l'ensemble des cours disponibles."
        sectionSlug={section.slug}
      />
      <SectionDetailContent section={section} />
    </>
  );
}
