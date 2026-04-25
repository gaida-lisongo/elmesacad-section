'use client';

import { useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  StudentCardCreate,
  StudentCardItem,
  StudentItem,
} from "@/app/(site)/(secure)/etudiants/_components/StudentCards";

const mockStudents: StudentItem[] = [
  { id: "s1", name: "Grace Ilunga", matricule: "ET-001", email: "grace@inbtp.cd", diplome: "Licence", status: "active" },
  { id: "s2", name: "Merveille Mbuyi", matricule: "ET-002", email: "merveille@inbtp.cd", diplome: "Master", status: "active" },
  { id: "s3", name: "Joel Kanku", matricule: "ET-003", email: "joel@inbtp.cd", diplome: "Graduat", status: "inactive" },
];

export default function EtudiantsPage() {
  const [items, setItems] = useState<StudentItem[]>(mockStudents);

  return (
    <PageManager
      title="Gestion des etudiants"
      description="Creation, lecture et suppression des etudiants"
      items={items}
      tabs={[
        { label: "Tous", value: "all" },
        { label: "Actifs", value: "active" },
        { label: "Inactifs", value: "inactive" },
      ]}
      activeTab="all"
      bulkCsvHeaders={["name", "email", "matricule", "diplome"]}
      CardItem={StudentCardItem}
      CardCreate={StudentCardCreate}
      onCreate={async (formData) => {
        const payload = {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          matricule: String(formData.get("matricule") ?? ""),
          diplome: String(formData.get("diplome") ?? ""),
        };

        const response = await fetch("/api/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const created = await response.json();
        if (created?.data?._id) {
          setItems((prev) => [
            {
              id: String(created.data._id),
              name: created.data.name,
              email: created.data.email,
              matricule: created.data.matricule,
              diplome: created.data.diplome,
              status: created.data.status,
            },
            ...prev,
          ]);
        }
      }}
      onBulkCreate={async (rawText, onProgress) => {
        const lines = rawText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const createdItems: StudentItem[] = [];
        const total = lines.length || 1;
        let done = 0;
        for (const line of lines) {
          const [name, email, matricule, diplome] = line.split(",").map((part) => part.trim());
          if (!name || !email || !matricule || !diplome) {
            done += 1;
            onProgress?.(Math.round((done / total) * 100));
            continue;
          }

          const response = await fetch("/api/student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, matricule, diplome }),
          });
          const created = await response.json();
          if (created?.data?._id) {
            createdItems.push({
              id: String(created.data._id),
              name: created.data.name,
              email: created.data.email,
              matricule: created.data.matricule,
              diplome: created.data.diplome,
              status: created.data.status,
            });
          }
          done += 1;
          onProgress?.(Math.round((done / total) * 100));
        }

        if (createdItems.length > 0) {
          setItems((prev) => [...createdItems, ...prev]);
        }
      }}
    />
  );
}
