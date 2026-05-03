import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchChargesHorairesByPromotionReferencesAction } from "@/actions/chargesHorairesTitulaire";
import { getPublicSectionBySlug } from "@/actions/publicSections";
import EtudesSectionClientView from "@/components/Etudes/EtudesSectionClientView";
import { fetchEtudesSectionResourcesGrouped } from "@/lib/product/fetchEtudesSectionResourcesGrouped";
import type { EtudesCourseSearchItem } from "@/types/etudesCourse";

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

  const [chargesByProgramme, resourcesGrouped] = await Promise.all([
    fetchChargesHorairesByPromotionReferencesAction(
      section.programmes.map((programme) => ({
        id: programme.id,
        slug: programme.slug,
        designation: programme.designation,
      })),
    ),
    fetchEtudesSectionResourcesGrouped(section.slug),
  ]);

  const courses: EtudesCourseSearchItem[] = chargesByProgramme.ok
    ? chargesByProgramme.data.flatMap((programmeCharges) => {
        return programmeCharges.items.map((rawItem, index) => {
          const item = rawItem as {
            _id?: string;
            matiere?: { designation?: string; reference?: string };
            unite?: { designation?: string; code_unite?: string; semestre?: string };
            titulaire?: { name?: string; email?: string };
            horaire?: { jour?: string; heure_debut?: string; heure_fin?: string };
            status?: string;
          };

          const matiereDesignation = item.matiere?.designation?.trim() ?? "Cours sans designation";
          const uniteDesignation = item.unite?.designation?.trim() ?? "Unite non precisee";
          const titulaireName = item.titulaire?.name?.trim() ?? "";
          const titulaireEmail = item.titulaire?.email?.trim() ?? "";

          return {
            id: String(item._id ?? `${programmeCharges.programmeId}-${index}`),
            sectionSlug: section.slug,
            programmeId: programmeCharges.programmeId,
            programmeSlug: programmeCharges.programmeSlug,
            programmeDesignation: programmeCharges.programmeDesignation,
            matiereDesignation,
            matiereReference: String(item.matiere?.reference ?? ""),
            uniteDesignation,
            uniteCode: item.unite?.code_unite?.trim() ?? "",
            semestre: item.unite?.semestre?.trim() ?? "",
            titulaireName,
            titulaireEmail,
            horaireJour: item.horaire?.jour?.trim() ?? "",
            horaireHeureDebut: item.horaire?.heure_debut?.trim() ?? "",
            horaireHeureFin: item.horaire?.heure_fin?.trim() ?? "",
            status: item.status?.trim() ?? "",
            searchText: [
              matiereDesignation,
              uniteDesignation,
              programmeCharges.programmeDesignation,
              item.unite?.code_unite ?? "",
              titulaireName,
              titulaireEmail,
            ]
              .join(" ")
              .toLowerCase(),
          };
        });
      })
    : [];

  console.log("[ETUDES][SECTION][CHARGES_PAR_PROGRAMME]", {
    sectionSlug: section.slug,
    programmes: section.programmes.length,
    ok: chargesByProgramme.ok,
    data: chargesByProgramme.ok
      ? chargesByProgramme.data.map((item) => ({
          programmeId: item.programmeId,
          programmeSlug: item.programmeSlug,
          count: item.count,
          status: item.status,
        }))
      : chargesByProgramme.message,
  });

  return (
    <EtudesSectionClientView
      section={section}
      courses={courses}
      resourcesGrouped={resourcesGrouped}
    />
  );
}
