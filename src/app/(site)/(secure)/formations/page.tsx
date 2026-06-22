"use client";

import { useCallback, useEffect, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  FormationCardCreate,
  FormationCardItem,
  type FormationListItem,
  type QuestionPayload,
} from "./_components/FormationCards";

const tabs = [
  { label: "Toutes", value: "all" },
  { label: "Actives", value: "active" },
  { label: "Inactives", value: "inactive" },
];

type ListResponse = {
  data: Record<string, unknown>[];
};

function toListItem(r: Record<string, unknown>): FormationListItem {
  const parseQuestions = (q: unknown): QuestionPayload[] => {
    if (!Array.isArray(q)) return [];
    return q
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const o = x as {
          question?: unknown;
          propositions?: unknown;
          bonneReponse?: unknown;
          points?: unknown;
        };
        return {
          question: String(o.question ?? ""),
          propositions: Array.isArray(o.propositions)
            ? o.propositions.filter((p): p is string => typeof p === "string")
            : [],
          bonneReponse: Number.isFinite(Number(o.bonneReponse)) ? Number(o.bonneReponse) : 0,
          points: Number.isFinite(Number(o.points)) && Number(o.points) > 0 ? Number(o.points) : 2,
        };
      });
  };

  const objectifs = Array.isArray(r.objectifs)
    ? r.objectifs.filter((o): o is string => typeof o === "string")
    : [];

  return {
    id: String(r._id ?? ""),
    slug: String(r.slug ?? ""),
    titre: String(r.titre ?? ""),
    description: String(r.description ?? ""),
    objectifs,
    questionnaire: parseQuestions(r.questionnaire),
    dateFormation: String(r.dateFormation ?? ""),
    image: String(r.image ?? ""),
    actif: Boolean(r.actif ?? true),
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
  };
}

export default function FormationsAdminPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<FormationListItem[]>([]);

  const fetchFormations = useCallback(async () => {
    const params = new URLSearchParams({ offset: "0", limit: "100", search: searchText });
    if (activeTab === "active") params.set("actif", "true");
    if (activeTab === "inactive") params.set("actif", "false");

    const response = await fetch(`/api/formations?${params.toString()}`);
    const payload = (await response.json()) as ListResponse;
    setItems((payload.data ?? []).map((x) => toListItem(x)));
  }, [activeTab, searchText]);

  useEffect(() => {
    fetchFormations();
  }, [fetchFormations]);

  return (
    <PageManager
      title="Gestion des formations"
      description="Créez, modifiez et suivez les formations. Chaque formation est présentée sous forme de carte pleine largeur avec QR code et participants."
      bareListItems
      items={items}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher par titre, slug ou description"
      listLayout="list"
      CardItem={FormationCardItem}
      CardCreate={FormationCardCreate}
      onCreate={async (formData) => {
        const titre = String(formData.get("titre") ?? "").trim();
        const dateFormation = String(formData.get("dateFormation") ?? "").trim();
        const image = String(formData.get("image") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim();
        const actif = formData.get("actif") === "on";

        let objectifs: string[] = [];
        try {
          objectifs = JSON.parse(String(formData.get("objectifs") ?? "[]")) as string[];
        } catch {
          objectifs = [];
        }

        let questionnaire: QuestionPayload[] = [];
        try {
          questionnaire = JSON.parse(String(formData.get("questionnaire") ?? "[]")) as QuestionPayload[];
        } catch {
          questionnaire = [];
        }

        const payload = {
          titre,
          description,
          objectifs,
          questionnaire,
          dateFormation,
          image,
          actif,
        };

        const res = await fetch("/api/formations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string };
          window.alert(j.message ?? "Création impossible");
          return;
        }
        await fetchFormations();
      }}
      onDelete={async (id) => {
        if (!confirm("Supprimer cette formation ? Les participants associés seront également supprimés.")) return;
        await fetch(`/api/formations/${id}`, { method: "DELETE" });
        await fetchFormations();
      }}
    />
  );
}
