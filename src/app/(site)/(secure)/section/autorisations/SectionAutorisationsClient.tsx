"use client";

import { useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  SECTION_AUTHORIZATION_PRESETS,
  SectionAuthorizationCardCreate,
  SectionAuthorizationCardItem,
  resolveDesignationForItem,
  type JuryKind,
  type SectionAuthorizationItem,
  type SectionAuthorizationTab,
} from "./_components/SectionAuthorizationCards";

type AgentRef = {
  id: string;
  name: string;
  email: string;
  matricule: string;
  photo: string;
  role: string;
};

type LocalSectionAssignments = {
  sectionId: string;
  sectionDesignation: string;
  sectionSlug: string;
  gestionnaires: {
    appariteur: AgentRef | null;
    secretaire: AgentRef | null;
  };
  jury: {
    cours: {
      president: AgentRef | null;
      secretaire: AgentRef | null;
      membres: AgentRef[];
    };
    recherche: {
      president: AgentRef | null;
      secretaire: AgentRef | null;
      membres: AgentRef[];
    };
  };
};

const tabs = SECTION_AUTHORIZATION_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.tab,
}));

function one(
  tab: SectionAuthorizationTab,
  agent: AgentRef | null,
  juryKind?: JuryKind
): SectionAuthorizationItem[] {
  if (!agent) return [];
  const detail = resolveDesignationForItem(tab, juryKind);
  const suffix = juryKind ? `-${juryKind}` : "";
  return [
    {
      id: `${tab}${suffix}-${agent.id}`,
      tab,
      juryKind,
      designation: detail.designation,
      contextLabel: detail.contextLabel,
      agentId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
      agentMatricule: agent.matricule,
      agentRole: agent.role,
      agentPhoto: agent.photo,
    },
  ];
}

function many(tab: SectionAuthorizationTab, agents: AgentRef[], juryKind: JuryKind): SectionAuthorizationItem[] {
  return agents.map((agent) => {
    const detail = resolveDesignationForItem(tab, juryKind);
    return {
      id: `${tab}-${juryKind}-${agent.id}`,
      tab,
      juryKind,
      designation: detail.designation,
      contextLabel: detail.contextLabel,
      agentId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
      agentMatricule: agent.matricule,
      agentRole: agent.role,
      agentPhoto: agent.photo,
    };
  });
}

function flattenAssignments(section: LocalSectionAssignments): SectionAuthorizationItem[] {
  const items: SectionAuthorizationItem[] = [];
  items.push(...one("appariteur", section.gestionnaires.appariteur));
  items.push(...one("secretaire", section.gestionnaires.secretaire));
  items.push(...one("president", section.jury.cours.president, "cours"));
  items.push(...one("president", section.jury.recherche.president, "recherche"));
  items.push(...one("secretaire-jury", section.jury.cours.secretaire, "cours"));
  items.push(...one("secretaire-jury", section.jury.recherche.secretaire, "recherche"));
  items.push(...many("membre", section.jury.cours.membres, "cours"));
  items.push(...many("membre", section.jury.recherche.membres, "recherche"));
  return items;
}

export default function SectionAutorisationsClient({
  initialData,
}: {
  initialData: LocalSectionAssignments;
}) {
  const [activeTab, setActiveTab] = useState<SectionAuthorizationTab>("appariteur");
  const [searchText, setSearchText] = useState("");
  const [sectionData, setSectionData] = useState<LocalSectionAssignments>(initialData);

  const activePreset = useMemo(
    () => SECTION_AUTHORIZATION_PRESETS.find((x) => x.tab === activeTab) ?? SECTION_AUTHORIZATION_PRESETS[0],
    [activeTab]
  );

  const visibleItems = useMemo(() => {
    const all = flattenAssignments(sectionData);
    const tabRows = all.filter((row) => row.tab === activeTab);
    const q = searchText.trim().toLowerCase();
    if (!q) return tabRows;
    return tabRows.filter((row) =>
      [row.agentName, row.agentEmail, row.agentMatricule].some((v) => v.toLowerCase().includes(q))
    );
  }, [sectionData, activeTab, searchText]);

  return (
    <PageManager
      title={`Autorisations locales - ${sectionData.sectionDesignation}`}
      description="Attribution locale à la section (gestionnaires et jury), distincte des autorisations globales admin."
      bareListItems
      items={visibleItems}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as SectionAuthorizationTab)}
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher par nom, e-mail ou matricule de l'agent"
      CardItem={SectionAuthorizationCardItem}
      CardCreate={() => <SectionAuthorizationCardCreate preset={activePreset} />}
      onCreate={async (formData) => {
        const tab = String(formData.get("tab") ?? "").trim() as SectionAuthorizationTab;
        const agentId = String(formData.get("agentId") ?? "").trim();
        const juryKindRaw = String(formData.get("juryKind") ?? "").trim();
        const juryKind: JuryKind | undefined =
          juryKindRaw === "cours" || juryKindRaw === "recherche" ? juryKindRaw : undefined;
        if (!agentId || !tab) {
          window.alert("Sélectionnez un agent avant d'attribuer l'autorisation.");
          return;
        }

        const response = await fetch("/api/section/autorisations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: sectionData.sectionId,
            tab,
            juryKind,
            agentId,
          }),
        });
        const payload = (await response.json()) as { data?: LocalSectionAssignments; message?: string };
        if (!response.ok || !payload.data) {
          window.alert(payload.message ?? "Attribution impossible");
          return;
        }
        setSectionData(payload.data);
      }}
      onDelete={async (id) => {
        const match = flattenAssignments(sectionData).find((x) => x.id === id);
        if (!match) {
          window.alert("Autorisation introuvable.");
          return;
        }
        const target = match.designation;
        if (!window.confirm(`Retirer ${target} pour ${match.agentName} ?`)) {
          return;
        }
        const response = await fetch("/api/section/autorisations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: sectionData.sectionId,
            tab: match.tab,
            juryKind: match.juryKind,
            agentId: match.agentId,
          }),
        });
        const payload = (await response.json()) as { data?: LocalSectionAssignments; message?: string };
        if (!response.ok || !payload.data) {
          window.alert(payload.message ?? "Suppression impossible");
          return;
        }
        setSectionData(payload.data);
      }}
    />
  );
}
