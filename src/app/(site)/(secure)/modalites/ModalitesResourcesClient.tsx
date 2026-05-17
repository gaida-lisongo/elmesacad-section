"use client";

import { useCallback, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import PageManager from "@/components/secure/PageManager";
import type { PageTab } from "@/components/secure/PageManager";
import type { ResourceFraisItem, ResourceType } from "./types";
import ResourceFraisCard from "./ResourceFraisCard";

// Actions par type de ressource
import {
  listGestionnaireSessionResourcesAction,
  patchGestionnaireSessionResourceStatusAction,
  deleteGestionnaireSessionResourceAction,
} from "@/actions/gestionnaireSessionResources";

import {
  listGestionnaireValidationResourcesAction,
  patchGestionnaireValidationResourceStatusAction,
  deleteGestionnaireValidationResourceAction,
} from "@/actions/gestionnaireValidationResources";

import {
  listGestionnaireReleveResourcesAction,
  patchGestionnaireReleveResourceStatusAction,
  deleteGestionnaireReleveResourceAction,
} from "@/actions/gestionnaireReleveResources";

import {
  listGestionnaireLaboResourcesAction,
  patchGestionnaireLaboResourceStatusAction,
  deleteGestionnaireLaboResourceAction,
} from "@/actions/gestionnaireLaboResources";

type Props = {
  sectionSlug: string;
  sectionDesignation: string;
  initialData: Record<ResourceType, { rows: ResourceFraisItem[]; total: number; page: number; limit: number }>;
  initialError?: string;
};

const TABS: PageTab[] = [
  { label: "Sessions", value: "session" },
  { label: "Validations", value: "validation" },
  { label: "Relevés", value: "releve" },
  { label: "Laboratoires", value: "labo" },
];

const TAB_DESCRIPTIONS: Record<ResourceType, string> = {
  session: "Gérez les frais des sessions d'enrôlement et d'examen. Vérifiez les paiements avant de permettre l'accès.",
  validation: "Gérez les frais des fiches de validation des acquis. Contrôlez les paiements des étudiants.",
  releve: "Gérez les frais des relevés de cotes. Vérifiez les paiements avant la délivrance.",
  labo: "Gérez les frais des bons de laboratoire. Contrôlez l'accès aux travaux pratiques.",
};

export default function ModalitesResourcesClient({
  sectionSlug,
  sectionDesignation,
  initialData,
  initialError,
}: Props) {
  const [activeTab, setActiveTab] = useState<ResourceType>("session");
  const [data, setData] = useState(initialData);
  const [bannerError, setBannerError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();
  
  // États pour les actions en cours
  const [statusToggleId, setStatusToggleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentData = data[activeTab];

  const loadData = useCallback(
    async (type: ResourceType, page: number, search: string) => {
      setBannerError(undefined);
      startTransition(async () => {
        try {
          let result;
          switch (type) {
            case "session":
              result = await listGestionnaireSessionResourcesAction({
                sectionSlug,
                page,
                limit: 10,
                search,
              });
              break;
            case "validation":
              result = await listGestionnaireValidationResourcesAction({
                sectionSlug,
                page,
                limit: 10,
                search,
              });
              break;
            case "releve":
              result = await listGestionnaireReleveResourcesAction({
                sectionSlug,
                page,
                limit: 10,
                search,
              });
              break;
            case "labo":
              result = await listGestionnaireLaboResourcesAction({
                sectionSlug,
                page,
                limit: 10,
                search,
              });
              break;
          }
          
          setData((prev) => ({
            ...prev,
            [type]: result,
          }));
        } catch (e) {
          setBannerError((e as Error).message);
        }
      });
    },
    [sectionSlug]
  );

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue as ResourceType);
    // Recharger les données pour le nouvel onglet
    loadData(tabValue as ResourceType, 1, "");
  };

  const togglePublicationStatus = async (item: ResourceFraisItem) => {
    const currentStatus = item.status.toLowerCase();
    const nextActive = !(currentStatus === "active" || currentStatus === "published" || currentStatus === "disponible");
    
    setBannerError(undefined);
    setStatusToggleId(item.id);
    
    try {
      let updated;
      switch (activeTab) {
        case "session":
          updated = await patchGestionnaireSessionResourceStatusAction({
            sectionSlug,
            id: item.id,
            status: nextActive ? "active" : "inactive",
          });
          break;
        case "validation":
          updated = await patchGestionnaireValidationResourceStatusAction({
            sectionSlug,
            id: item.id,
            status: nextActive ? "active" : "inactive",
          });
          break;
        case "releve":
          updated = await patchGestionnaireReleveResourceStatusAction({
            sectionSlug,
            id: item.id,
            status: nextActive ? "active" : "inactive",
          });
          break;
        case "labo":
          updated = await patchGestionnaireLaboResourceStatusAction({
            sectionSlug,
            id: item.id,
            status: nextActive ? "active" : "inactive",
          });
          break;
      }
      
      setData((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          rows: prev[activeTab].rows.map((r) => (r.id === item.id ? { ...r, ...updated } : r)),
        },
      }));
    } catch (e) {
      setBannerError((e as Error).message);
    } finally {
      setStatusToggleId(null);
    }
  };

  const handleDelete = async (item: ResourceFraisItem) => {
    if (!window.confirm(`Supprimer la ressource « ${item.designation} » ?`)) return;
    
    setBannerError(undefined);
    setDeletingId(item.id);
    
    startTransition(async () => {
      try {
        switch (activeTab) {
          case "session":
            await deleteGestionnaireSessionResourceAction({ sectionSlug, id: item.id });
            break;
          case "validation":
            await deleteGestionnaireValidationResourceAction({ sectionSlug, id: item.id });
            break;
          case "releve":
            await deleteGestionnaireReleveResourceAction({ sectionSlug, id: item.id });
            break;
          case "labo":
            await deleteGestionnaireLaboResourceAction({ sectionSlug, id: item.id });
            break;
        }
        loadData(activeTab, currentData.page, "");
      } catch (e) {
        setBannerError((e as Error).message);
      } finally {
        setDeletingId(null);
      }
    });
  };

  // Composant Card pour PageManager
  const CardItem = ({ item }: { item: ResourceFraisItem }) => (
    <ResourceFraisCard
      item={item}
      resourceType={activeTab}
      onToggleStatus={togglePublicationStatus}
      onDelete={handleDelete}
      isToggling={statusToggleId === item.id}
      isDeleting={deletingId === item.id}
    />
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
          <Icon icon="solar:wallet-money-bold-duotone" className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          Modalités de paiement
        </h1>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <p className="flex flex-wrap items-center gap-2">
            <Icon icon="solar:buildings-3-bold-duotone" className="h-4 w-4 shrink-0 text-gray-400" />
            Section : <strong>{sectionDesignation}</strong>
            <span className="hidden sm:inline">—</span>
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sectionRef = {sectionSlug}</code>
          </p>
        </div>
      </header>

      {/* Banner Error */}
      {bannerError ? (
        <div className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{bannerError}</p>
        </div>
      ) : null}

      {/* PageManager avec tabs */}
      <PageManager
        title={TABS.find((t) => t.value === activeTab)?.label || "Ressources"}
        description={TAB_DESCRIPTIONS[activeTab]}
        items={currentData.rows}
        tabs={TABS}
        activeTab={activeTab}
        CardItem={CardItem}
        onTabChange={handleTabChange}
        searchPlaceholder={`Rechercher dans ${TABS.find((t) => t.value === activeTab)?.label.toLowerCase()}...`}
        showCreateButton={false}
        listLayout="grid-3"
        bareListItems={true}
      />

      {/* Pagination */}
      {currentData.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            {currentData.total} résultat{currentData.total > 1 ? "s" : ""} — page {currentData.page} /{" "}
            {Math.max(1, Math.ceil(currentData.total / currentData.limit))}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentData.page <= 1 || pending}
              onClick={() => loadData(activeTab, currentData.page - 1, "")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={pending || currentData.page * currentData.limit >= currentData.total}
              onClick={() => loadData(activeTab, currentData.page + 1, "")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
