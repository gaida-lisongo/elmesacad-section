"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageListe, PageListeCategoryCard } from "@/components/Layout/PageListe";
import type { SectionDashboardFlags } from "@/lib/section/sectionDashboardFlags";
import { sectionBureauHatLabels } from "@/lib/section/sectionDashboardFlags";
import { SectionChargesHub } from "./SectionChargesHub";

type SectionBureauRow = { _id: string; designation: string; slug: string; cycle: string };

type GestionnaireSlot = { id: string; name: string; email: string } | null;

type DashboardMeta = {
  section: SectionBureauRow;
  gestionnaires: {
    secretaire: GestionnaireSlot;
    appariteur: GestionnaireSlot;
  };
  flags: SectionDashboardFlags;
};

function PlaceholderBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-4 py-8 text-center dark:border-gray-600 dark:bg-gray-800/40">
      <p className="text-sm font-medium text-midnight_text dark:text-white">{title}</p>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export default function SectionDashboardClient({ isOrganisateur }: { isOrganisateur: boolean }) {
  const [sections, setSections] = useState<SectionBureauRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(isOrganisateur);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [meta, setMeta] = useState<DashboardMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOrganisateur) {
      setSectionsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-sections/bureau");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setSectionsError((json.message as string) || "Impossible de charger vos sections.");
          return;
        }
        const data = (json.data || []) as SectionBureauRow[];
        if (!cancelled) {
          setSections(data);
          setActiveId((prev) => {
            if (!data.length) return null;
            if (prev && data.some((s) => s._id === prev)) return prev;
            return data[0]._id;
          });
        }
      } catch {
        if (!cancelled) setSectionsError("Erreur réseau.");
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOrganisateur]);

  const loadMeta = useCallback(async (sectionId: string) => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const res = await fetch(`/api/sections/${sectionId}/dashboard-meta`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMeta(null);
        setMetaError((json.message as string) || "Impossible de charger le tableau de bord.");
        return;
      }
      const payload = json.data as DashboardMeta;
      setMeta(payload);
    } catch {
      setMeta(null);
      setMetaError("Erreur réseau.");
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMeta(null);
      return;
    }
    loadMeta(activeId);
  }, [activeId, loadMeta]);

  const activeSection = useMemo(
    () => sections.find((s) => s._id === activeId) || null,
    [sections, activeId]
  );

  const hatLabels = useMemo(
    () => (meta?.flags.bureauHats.length ? sectionBureauHatLabels(meta.flags.bureauHats) : []),
    [meta?.flags.bureauHats]
  );

  if (!isOrganisateur) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <h1 className="text-lg font-semibold">Tableau de bord section</h1>
        <p className="mt-2 text-sm">
          Réservé aux <strong>organisateurs</strong> membres du bureau d’une section (chef de section, chargé
          d’enseignement ou chargé de recherche).
        </p>
      </div>
    );
  }

  if (sectionsLoading) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">Chargement…</p>;
  }

  if (sectionsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <p>{sectionsError}</p>
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Tableau de bord section</h1>
        <p className="mt-3 max-w-xl text-sm text-gray-600 dark:text-gray-400">
          Vous n’êtes pas désigné sur le bureau d’une section. Ce tableau de bord permet de suivre l’avancement
          pédagogique et la recherche, de gérer les gestionnaires (secrétariat, appariteur) et, selon votre rôle ou vos
          autorisations, les protocoles de recherche, les charges horaires et les ventes.
        </p>
        <Link
          href="/sections"
          className="mt-4 inline-block text-sm font-medium text-[#082b1c] underline dark:text-[#5ec998]"
        >
          Voir les sections
        </Link>
      </div>
    );
  }

  return (
    <PageListe
      heading={
        <div>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Tableau de bord section</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Suivi de l’enseignement et de la recherche, équipe de gestion, et espaces métier selon votre fonction au
            bureau (ou codes d’autorisation).
          </p>
        </div>
      }
      toolbar={
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
        >
          Tableau de bord général
        </Link>
      }
      sidebar={
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Section active
            </h2>
            <p className="mt-2 text-sm font-medium text-midnight_text dark:text-white">
              {activeSection?.designation}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{activeSection?.cycle}</p>
            {activeSection ? (
              <Link
                href={`/sections/${encodeURIComponent(activeSection.slug)}`}
                className="mt-2 inline-block text-xs text-[#082b1c] underline dark:text-[#5ec998]"
              >
                Fiche section
              </Link>
            ) : null}
          </div>
          {sections.length > 1 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Autres sections
              </h2>
              <ul className="mt-2 space-y-1">
                {sections
                  .filter((s) => s._id !== activeId)
                  .map((s) => (
                    <li key={s._id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(s._id)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm text-midnight_text hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                      >
                        {s.designation}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      }
    >
      {metaLoading ? (
        <p className="text-sm text-gray-500">Chargement du tableau de bord…</p>
      ) : metaError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {metaError}
        </div>
      ) : meta ? (
        <div className="space-y-6">
          {hatLabels.length > 0 ? (
            <div className="rounded-xl border border-[#082b1c]/20 bg-[#082b1c]/5 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Votre fonction sur cette section
              </p>
              <p className="mt-1 text-sm text-midnight_text dark:text-white">{hatLabels.join(" · ")}</p>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            {meta.flags.canViewAvancementEnseignement ? (
              <PageListeCategoryCard
                title="Avancement — enseignement"
                meta="Indicateurs et jalons pédagogiques (à brancher)"
              >
                <PlaceholderBlock
                  title="Données à connecter"
                  description="Les calculs et graphiques d’avancement de l’enseignement seront branchés ici (charges horaires, délivrance, etc.)."
                />
              </PageListeCategoryCard>
            ) : null}

            {meta.flags.canViewAvancementRecherche ? (
              <PageListeCategoryCard
                title="Avancement — recherche"
                meta="Suivi des activités et livrables recherche (à brancher)"
              >
                <PlaceholderBlock
                  title="Données à connecter"
                  description="Les indicateurs de recherche et l’état des protocoles seront affichés ici selon vos règles métier."
                />
              </PageListeCategoryCard>
            ) : null}
          </div>

          {meta.flags.canManageGestionnaires ? (
            <PageListeCategoryCard
              title="Gestionnaires de la section"
              meta="Secrétariat et appariteur — CRUD à finaliser"
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 dark:border-gray-800 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Secrétaire</p>
                    {meta.gestionnaires.secretaire ? (
                      <p className="text-sm font-semibold text-midnight_text dark:text-white">
                        {meta.gestionnaires.secretaire.name}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Non renseigné</p>
                    )}
                    {meta.gestionnaires.secretaire?.email ? (
                      <p className="text-xs text-gray-500">{meta.gestionnaires.secretaire.email}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium opacity-60 dark:border-gray-600"
                    title="API et formulaire à brancher"
                  >
                    Modifier
                  </button>
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 dark:border-gray-800 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Appariteur</p>
                    {meta.gestionnaires.appariteur ? (
                      <p className="text-sm font-semibold text-midnight_text dark:text-white">
                        {meta.gestionnaires.appariteur.name}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Non renseigné</p>
                    )}
                    {meta.gestionnaires.appariteur?.email ? (
                      <p className="text-xs text-gray-500">{meta.gestionnaires.appariteur.email}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium opacity-60 dark:border-gray-600"
                    title="API et formulaire à brancher"
                  >
                    Modifier
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Les actions Création / Mise à jour / Suppression des gestionnaires seront exposées via l’API section
                  (à venir).
                </p>
              </div>
            </PageListeCategoryCard>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-1">
            {meta.flags.canManageProtocolesRecherche ? (
              <PageListeCategoryCard
                title="Protocoles de recherche"
                meta="Chargé de recherche — ou autorisation SPR"
              >
                <PlaceholderBlock
                  title="Gestion des protocoles"
                  description="Liste, création et suivi des protocoles de recherche : logique métier et présentation à définir ensemble."
                />
              </PageListeCategoryCard>
            ) : null}

            {meta.flags.canManageChargesHoraires ? (
              <PageListeCategoryCard
                title="Charges horaires"
                meta="Chargé d’enseignement — ou autorisations CE / SCH · service TITULAIRE_SERVICE (actions serveur)"
              >
                {activeId ? <SectionChargesHub sectionId={activeId} /> : null}
              </PageListeCategoryCard>
            ) : null}

            {meta.flags.canManageVentes ? (
              <PageListeCategoryCard title="Ventes" meta="Chef de section — ou autorisation SVN">
                <PlaceholderBlock
                  title="Ventes"
                  description="Indicateurs commerciaux / ventes section : données et graphiques à connecter."
                />
              </PageListeCategoryCard>
            ) : null}
          </div>

          {!meta.flags.canManageProtocolesRecherche &&
          !meta.flags.canManageChargesHoraires &&
          !meta.flags.canManageVentes ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Aucun espace métier supplémentaire (protocoles, charges horaires, ventes) : demandez les rôles bureau
              correspondants ou les codes d’autorisation SPR, CE (charges horaires), SCH, SVN.
            </p>
          ) : null}
        </div>
      ) : null}
    </PageListe>
  );
}
