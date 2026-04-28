import SectionProgrammeParcoursClient from "./SectionProgrammeParcoursClient";

export default async function SectionProgrammeParcoursPage({
  params,
}: {
  params: Promise<{ programmeSlug: string; anneeSlug: string }>;
}) {
  const { programmeSlug, anneeSlug } = await params;
  return <SectionProgrammeParcoursClient programmeSlug={programmeSlug} anneeSlug={anneeSlug} />;
}
