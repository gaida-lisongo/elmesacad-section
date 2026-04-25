"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  SectionCardCreate,
  SectionCardItem,
  type SectionListItem,
} from "@/app/(site)/(secure)/sections/_components/SectionCards";
import {
  DEFAULT_SECTION_CYCLE_FOR_CREATE,
  SECTION_CYCLE_TABS,
} from "@/lib/constants/sectionCycles";

type ListResponse = {
  data: Record<string, unknown>[];
};

function toListItem(r: Record<string, unknown>): SectionListItem {
  const desc = r.description;
  const description: { title: string; contenu: string }[] = [];
  if (Array.isArray(desc)) {
    for (const block of desc) {
      if (!block || typeof block !== "object") continue;
      const b = block as { title?: unknown; contenu?: unknown };
      const title = String(b.title ?? "").trim();
      const contenu = String(b.contenu ?? "").trim();
      if (!title && !contenu) continue;
      description.push({ title: title || "Sans titre", contenu });
    }
  }
  return {
    id: String(r._id ?? ""),
    slug: String(r.slug ?? ""),
    designation: String(r.designation ?? ""),
    cycle: String(r.cycle ?? ""),
    email: r.email != null ? String(r.email) : undefined,
    logo: String(r.logo ?? ""),
    description,
  };
}

export default function SectionsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<SectionListItem[]>([]);

  const currentCycle = useMemo(
    () => (activeTab === "all" ? DEFAULT_SECTION_CYCLE_FOR_CREATE : activeTab),
    [activeTab]
  );

  const fetchSections = useCallback(async () => {
    const params = new URLSearchParams({ offset: "0", limit: "100", search: searchText });
    if (activeTab !== "all") {
      params.set("cycle", activeTab);
    }
    const response = await fetch(`/api/sections?${params.toString()}`);
    const payload = (await response.json()) as ListResponse;
    setItems((payload.data ?? []).map((x) => toListItem(x)));
  }, [activeTab, searchText]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return (
    <PageManager
      title="Gestion des sections"
      description="Création, consultation et suivi des sections pédagogiques"
      bareListItems
      items={items}
      tabs={SECTION_CYCLE_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Rechercher par désignation ou e-mail"
      CardItem={SectionCardItem}
      CardCreate={() => <SectionCardCreate defaultCycle={currentCycle} />}
      onCreate={async (formData) => {
        const chef = String(formData.get("chefSection") ?? "").trim();
        const ens = String(formData.get("chargeEnseignement") ?? "").trim();
        const rech = String(formData.get("chargeRecherche") ?? "").trim();
        const bureau: Record<string, string> = {};
        if (chef) bureau.chefSection = chef;
        if (ens) bureau.chargeEnseignement = ens;
        if (rech) bureau.chargeRecherche = rech;

        let description: { title: string; contenu: string }[] | undefined;
        const descJson = String(formData.get("descriptionJson") ?? "[]");
        try {
          const raw = JSON.parse(descJson) as unknown;
          if (Array.isArray(raw)) {
            const blocks = raw
              .map((x) => {
                if (!x || typeof x !== "object") return null;
                const o = x as { title?: unknown; contenu?: unknown };
                const title = String(o.title ?? "").trim();
                const contenu = String(o.contenu ?? "").trim();
                if (!title && !contenu) return null;
                return { title: title || "Sans titre", contenu };
              })
              .filter((b): b is { title: string; contenu: string } => b != null);
            if (blocks.length) description = blocks;
          }
        } catch {
          /* ignore */
        }

        const payload = {
          designation: String(formData.get("designation") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim() || undefined,
          website: String(formData.get("website") ?? "").trim() || undefined,
          telephone: String(formData.get("telephone") ?? "").trim() || undefined,
          description,
          cycle: currentCycle,
          logo: String(formData.get("logo") ?? "").trim(),
          bureau: Object.keys(bureau).length ? bureau : undefined,
        };

        const res = await fetch("/api/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string };
          window.alert(j.message ?? "Création impossible");
          return;
        }
        await fetchSections();
      }}
      onDelete={async (id) => {
        await fetch(`/api/sections/${id}`, { method: "DELETE" });
        await fetchSections();
      }}
    />
  );
}
