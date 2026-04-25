'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  StudentCardCreate,
  StudentCardItem,
  StudentItem,
} from "@/app/(site)/(secure)/etudiants/_components/StudentCards";

const cycleTabs = [
  { label: "Tous", value: "all" },
  { label: "Science de Base", value: "Science de Base" },
  { label: "Licence", value: "Licence" },
  { label: "Master", value: "Master" },
  { label: "Doctorat", value: "Doctorat" },
];

const defaultCycleForCreate = "Licence";

type StudentsApiResponse = {
  data: StudentItem[];
};

export default function EtudiantsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<StudentItem[]>([]);

  const fetchStudents = useCallback(async () => {
    const params = new URLSearchParams({
      offset: "0",
      limit: "50",
      search: searchText,
    });

    if (activeTab !== "all") {
      params.set("cycle", activeTab);
    }

    const response = await fetch(`/api/student?${params.toString()}`);
    const payload = (await response.json()) as StudentsApiResponse;
    setItems(payload.data ?? []);
  }, [activeTab, searchText]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const currentCycle = useMemo(
    () => (activeTab === "all" ? defaultCycleForCreate : activeTab),
    [activeTab]
  );

  return (
    <PageManager
      title="Gestion des étudiants"
      description="Création, consultation et suivi des étudiants par cycle"
      bareListItems
      items={items}
      tabs={cycleTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher par nom, email ou matricule"
      bulkCsvHeaders={["name", "email", "matricule", "diplome"]}
      CardItem={StudentCardItem}
      CardCreate={() => <StudentCardCreate defaultCycle={currentCycle} />}
      onCreate={async (formData) => {
        const payload = {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          matricule: String(formData.get("matricule") ?? ""),
          diplome: String(formData.get("diplome") ?? ""),
          cycle: currentCycle,
        };

        await fetch("/api/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        await fetchStudents();
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

          await fetch("/api/student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              matricule,
              diplome,
              cycle: currentCycle,
            }),
          });
          done += 1;
          onProgress?.(Math.round((done / total) * 100));
        }

        await fetchStudents();
      }}
      onDelete={async (id) => {
        await fetch(`/api/student/${id}`, { method: "DELETE" });
        await fetchStudents();
      }}
    />
  );
}
