'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import { AgentCardCreate, AgentCardItem, AgentItem } from "./_components/AgentCards";

const roleTabs = [
  { label: "Admin", value: "admin" },
  { label: "Organisateur", value: "organisateur" },
  { label: "Gestionnaire", value: "gestionnaire" },
  { label: "Titulaire", value: "titulaire" },
];

type AgentsApiResponse = {
  data: AgentItem[];
};

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<AgentItem[]>([]);

  const fetchAgents = useCallback(async () => {
    const params = new URLSearchParams({
      offset: "0",
      limit: "50",
      search: searchText,
    });

    if (activeTab !== "all") {
      params.set("role", activeTab);
    }

    const response = await fetch(`/api/agent?${params.toString()}`);
    const payload = (await response.json()) as AgentsApiResponse;
    setItems(payload.data ?? []);
  }, [activeTab, searchText]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const currentRole = useMemo(
    () => (activeTab === "all" ? "organisateur" : activeTab),
    [activeTab]
  );

  return (
    <PageManager
      title="Gestion des agents"
      description="Creation, lecture et suppression des agents par role"
      items={items}
      tabs={roleTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher par nom, email ou matricule"
      bulkCsvHeaders={["name", "email", "matricule", "diplome"]}
      CardItem={AgentCardItem}
      CardCreate={() => <AgentCardCreate defaultRole={currentRole} />}
      onCreate={async (formData) => {
        const payload = {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          matricule: String(formData.get("matricule") ?? ""),
          diplome: String(formData.get("diplome") ?? ""),
          role: currentRole,
        };

        await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        await fetchAgents();
      }}
      onBulkCreate={async (rawText, onProgress) => {
        const lines = rawText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const total = lines.length || 1;
        let done = 0;
        for (const line of lines) {
          const [name, email, matricule, diplome] = line.split(",").map((part) => part.trim());
          if (!name || !email || !matricule || !diplome) {
            done += 1;
            onProgress?.(Math.round((done / total) * 100));
            continue;
          }

          await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              matricule,
              diplome,
              role: currentRole,
            }),
          });
          done += 1;
          onProgress?.(Math.round((done / total) * 100));
        }

        await fetchAgents();
      }}
      onDelete={async (id) => {
        await fetch(`/api/agent/${id}`, { method: "DELETE" });
        await fetchAgents();
      }}
    />
  );
}
