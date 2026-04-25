'use client';

import PageManager from "@/components/secure/PageManager";

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

function SectionCardItem({ item }: { item: SectionItem }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-midnight_text dark:text-white">{item.name}</h3>
      <p className="text-xs text-gray-500">Responsable: {item.responsable}</p>
      <a href={`/sections/${item.id}`} className="mt-2 inline-block text-xs font-semibold text-[#082b1c]">
        Voir details
      </a>
    </div>
  );
}

function SectionCardCreate() {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <input name="name" placeholder="Nom section" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="responsable" placeholder="Responsable" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <button type="submit" className="rounded bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white md:col-span-2">
        Creer section
      </button>
    </div>
  );
}

export default function SectionsPage() {
  return (
    <PageManager
      title="Gestion des sections"
      description="Creation, lecture et suppression des sections"
      items={mockSections}
      tabs={[
        { label: "Toutes", value: "all" },
        { label: "Operationnelles", value: "active" },
      ]}
      activeTab="all"
      bulkCsvHeaders={["name", "responsable"]}
      CardItem={SectionCardItem}
      CardCreate={SectionCardCreate}
      onBulkCreate={async (rawText, onProgress) => {
        const lines = rawText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        onProgress?.(100);
        console.log("Bulk create sections", lines);
      }}
    />
  );
}
