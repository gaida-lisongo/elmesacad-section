"use client";

import { useState, useTransition, useCallback } from "react";
import { Icon } from "@iconify/react";
import {
  upsertRessourceFraisAction,
  deleteRessourceFraisAction,
  type RessourceFraisRow,
  type ModaliteOption,
  type ResourceType,
} from "@/actions/ressourceFraisActions";

type ResourceItem = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  [key: string]: unknown;
};

type Props = {
  resourceType: ResourceType;
  resourceTypeLabel: string;
  resourceTypeIcon: string;
  sectionSlug: string;
  sectionDesignation: string;
  resources: ResourceItem[];
  ressourcesFrais: RessourceFraisRow[];
  modalites: ModaliteOption[];
  initialError?: string;
};

function isPublicationActive(status: string): boolean {
  const st = (status || "").toLowerCase();
  return st === "active" || st === "published" || st === "disponible";
}

export default function ModalitesRessourceFraisClient({
  resourceType,
  resourceTypeLabel,
  resourceTypeIcon,
  sectionSlug,
  sectionDesignation,
  resources,
  ressourcesFrais,
  modalites,
  initialError,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [bannerError, setBannerError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [selectedModaliteIds, setSelectedModaliteIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRessourceFrais = (resourceId: string) => {
    return ressourcesFrais.find((rf) => rf.ressource._id === resourceId);
  };

  const openModal = (resource: ResourceItem) => {
    setEditingResource(resource);
    const existing = getRessourceFrais(resource.id);
    setSelectedModaliteIds(existing?.modalites.map((m) => m.id) || []);
    setShowModal(true);
    setBannerError(undefined);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingResource(null);
    setSelectedModaliteIds([]);
  };

  const toggleModalite = (modaliteId: string) => {
    setSelectedModaliteIds((prev) =>
      prev.includes(modaliteId)
        ? prev.filter((id) => id !== modaliteId)
        : [...prev, modaliteId]
    );
  };

  const handleSave = async () => {
    if (!editingResource) return;
    if (selectedModaliteIds.length === 0) {
      setBannerError("Sélectionnez au moins une modalité.");
      return;
    }

    setIsSubmitting(true);
    setBannerError(undefined);

    try {
      await upsertRessourceFraisAction({
        resourceType,
        resourceId: editingResource.id,
        resourceDesignation: editingResource.designation,
        modaliteIds: selectedModaliteIds,
      });
      closeModal();
      // Recharger la page pour voir les changements
      window.location.reload();
    } catch (e) {
      setBannerError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (ressourceFraisId: string) => {
    if (!window.confirm("Supprimer les modalités associées à cette ressource ?")) return;
    setBannerError(undefined);
    startTransition(async () => {
      try {
        await deleteRessourceFraisAction({ id: ressourceFraisId });
        window.location.reload();
      } catch (e) {
        setBannerError((e as Error).message);
      }
    });
  };

  const filteredResources = resources.filter((r) =>
    r.designation.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
          <Icon icon={resourceTypeIcon} className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          Modalités — {resourceTypeLabel}
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

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-midnight_text dark:text-white">
            Ressources {resourceTypeLabel.toLowerCase()}
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-gray-600 dark:text-gray-400">
            Associez des modalités de paiement à chaque ressource. Les étudiants devront payer ces frais pour accéder à la ressource.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={`Rechercher une ${resourceTypeLabel.toLowerCase().slice(0, -1)}...`}
            disabled={pending}
            className="w-full min-w-[14rem] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-64"
          />
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <Icon icon={resourceTypeIcon} className="mb-3 h-14 w-14 text-gray-400" />
          <p className="font-semibold text-midnight_text dark:text-white">Aucune ressource trouvée</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {searchText ? "Aucun résultat pour votre recherche." : "Aucune ressource n'a encore été créée."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((r) => {
            const active = isPublicationActive(r.status);
            const rf = getRessourceFrais(r.id);
            const hasModalites = rf && rf.modalites.length > 0;

            return (
              <article
                key={r.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-1 flex-col p-5 pt-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                        <Icon icon={resourceTypeIcon} className="h-5 w-5 text-primary" />
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-gray-800">
                      <Icon icon="solar:wallet-money-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                      {r.amount} {r.currency}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-4 line-clamp-2 text-base font-bold leading-snug text-midnight_text dark:text-white">
                    {r.designation}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-gray-400">
                    <Icon icon="solar:hashtag-bold-duotone" className="mr-0.5 inline h-3 w-3" />
                    {r.id.slice(-10)}
                  </p>

                  {/* Modalités associées */}
                  <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Modalités associées
                    </p>
                    {hasModalites ? (
                      <div className="mt-2 space-y-1.5">
                        {rf!.modalites.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs dark:bg-gray-900"
                          >
                            <span className="font-medium text-midnight_text dark:text-white">{m.designation}</span>
                            <span className="font-semibold text-primary">{m.montant} USD</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                          <span className="text-xs font-bold text-midnight_text dark:text-white">Total</span>
                          <span className="text-sm font-bold text-primary">{rf!.totalMontant} USD</span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Aucune modalité associée. Cliquez sur "Associer" pour ajouter des modalités.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => openModal(r)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-midnight_text transition hover:border-primary/40 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                    >
                      <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4 text-primary" />
                      {hasModalites ? "Modifier" : "Associer"}
                    </button>
                    {hasModalites && rf ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(rf.id)}
                        disabled={pending}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                        aria-label="Supprimer"
                      >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-midnight_text dark:text-white">
                Associer des modalités
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <Icon icon="solar:close-circle-bold-duotone" className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {editingResource.designation}
            </p>

            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
              {modalites.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                  Aucune modalité disponible. Créez d'abord des modalités dans la page Modalités de paiement.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {modalites.map((m) => {
                    const isSelected = selectedModaliteIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex cursor-pointer items-center gap-3 p-3 transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isSelected ? "bg-primary/[0.05] dark:bg-primary/10" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleModalite(m.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-midnight_text dark:text-white">{m.designation}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {m.fraisDesignation} — {m.montant} USD
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary">{m.montant} USD</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedModaliteIds.length > 0 && (
              <div className="mt-3 rounded-lg bg-primary/[0.05] p-3 dark:bg-primary/10">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedModaliteIds.length} modalité{selectedModaliteIds.length > 1 ? "s" : ""} sélectionnée
                  {selectedModaliteIds.length > 1 ? "s" : ""}
                </p>
                <p className="text-sm font-bold text-primary">
                  Total: {" "}
                  {selectedModaliteIds.reduce((sum, id) => {
                    const m = modalites.find((mod) => mod.id === id);
                    return sum + (m?.montant || 0);
                  }, 0)}{" "}
                  USD
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-midnight_text transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || selectedModaliteIds.length === 0}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
