import PageDetail from "@/components/secure/PageDetail";

type SectionItem = {
  id: string;
  name: string;
  responsable: string;
};

const mockSections: SectionItem[] = [
  { id: "sec1", name: "Scolarite", responsable: "Mme Kanku" },
  { id: "sec2", name: "Finances", responsable: "M. Lukusa" },
  { id: "sec3", name: "Ressources", responsable: "Mme Mumpeta" },
];

export default async function SectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = mockSections.find((item) => item.id === slug) ?? mockSections[0];

  const Card = () => (
    <div className="grid gap-3 md:grid-cols-2">
      <input defaultValue={section.name} className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={section.responsable} className="rounded border border-gray-300 px-3 py-2 text-sm" />
    </div>
  );

  return (
    <PageDetail
      title={`Detail section: ${section.name}`}
      description="Visualiser et editer les informations de la section"
      breadcrumbs={[
        { href: "/", text: "Home" },
        { href: "/sections", text: "Sections" },
        { href: `/sections/${section.id}`, text: section.name },
      ]}
      CardDetail={Card}
      onSave={async () => {
        "use server";
      }}
    />
  );
}
