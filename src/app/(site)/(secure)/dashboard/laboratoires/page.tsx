"use client";

import { useCallback, useEffect, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import { LaboratoireCardCreate, LaboratoireCardItem, type LaboratoireItem } from "./_components/LaboratoireCards";
import { listLaboratoires, createLaboratoire, deleteLaboratoire } from "@/actions/laboratoireActions";

const tabs = [{ label: "Tous les laboratoires", value: "all" }];

export default function LaboratoiresAdminPage() {
  const [items, setItems] = useState<LaboratoireItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabs = useCallback(async () => {
    setLoading(true);
    const labs = await listLaboratoires();
    setItems(
      labs.map((l: any) => ({
        id: l._id,
        nom: l.nom,
        slug: l.slug,
        techniciensCount: l.techniciens?.length || 0,
        departementsCount: l.departements?.length || 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  return (
    <PageManager
      title="Gestion des Laboratoires"
      description="Créez et gérez les laboratoires de l'INBTP, leurs techniciens et leurs départements."
      items={items}
      tabs={tabs}
      activeTab="all"
      CardItem={(props) => (
        <LaboratoireCardItem
          {...props}
          onDelete={async (id) => {
            if (confirm("Supprimer ce laboratoire ? Cette action est irréversible.")) {
              await deleteLaboratoire(id);
              await fetchLabs();
            }
          }}
        />
      )}
      CardCreate={LaboratoireCardCreate}
      onCreate={async (formData) => {
        const nom = String(formData.get("nom") ?? "");
        const slug = String(formData.get("slug") ?? "");
        const techniciens = JSON.parse(String(formData.get("techniciens") ?? "[]"));
        await createLaboratoire({ nom, slug, techniciens });
        await fetchLabs();
      }}
    />
  );
}
