"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type {
  DescriptionSectionInput,
  LecteurAgentPayload,
} from "@/actions/organisateurSujetResources";
import {
  createOrganisateurSujetResourceAction,
  getOrganisateurSujetResourceAction,
  updateOrganisateurSujetResourceAction,
} from "@/actions/organisateurSujetResources";
import ResourceMultiStepFormShell, {
  type ResourceStepMeta,
} from "@/components/secure/etudiant-resources/ResourceMultiStepFormShell";
import { SujetResourceDescriptionEditor } from "./SujetResourceDescriptionEditor";

type ProgrammeOption = { slug: string; designation: string; credits: number };

type JuryRechercheMemberOption = {
  id: string;
  nom: string;
  email: string;
  matricule: string;
  role: "president" | "secretaire" | "membre";
};

export type ChefSectionDefaults = {
  name: string;
  telephone: string;
  email: string;
};

type Props = {
  mode: "create" | "edit";
  editingId: string | null;
  sectionSlug: string;
  sectionDesignation: string;
  programmes: ProgrammeOption[];
  juryRechercheMembers: JuryRechercheMemberOption[];
  chefSection: ChefSectionDefaults;
  onCancel: () => void;
  onSaved: () => void;
};

const CURRENCIES = ["USD", "CDF"] as const;

type Step = 1 | 2 | 3 | 4;

function emptyForm() {
  return {
    designation: "",
    amount: "0",
    currency: "USD",
    programmeSlug: "",
    brandingSectionLabel: "",
    brandingContact: "",
    brandingEmail: "",
    brandingAdresse: "",
  };
}

function defaultDescriptionSections(): DescriptionSectionInput[] {
  return [{ title: "", contenu: [""] }];
}

function descriptionHasBody(sections: DescriptionSectionInput[]): boolean {
  for (const s of sections) {
    const lines = (s.contenu ?? []).map((c) => String(c).trim()).filter(Boolean);
    if (lines.length > 0) return true;
  }
  return false;
}

function roleBadge(role: JuryRechercheMemberOption["role"]) {
  switch (role) {
    case "president":
      return {
        label: "Président",
        className:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
      };
    case "secretaire":
      return {
        label: "Secrétaire",
        className:
          "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
      };
    default:
      return {
        label: "Membre",
        className:
          "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
      };
  }
}

export default function OrganisateurSujetResourceForm({
  mode,
  editingId,
  sectionSlug,
  sectionDesignation,
  programmes,
  juryRechercheMembers,
  chefSection,
  onCancel,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(emptyForm);
  const [descriptionSections, setDescriptionSections] = useState<DescriptionSectionInput[]>(
    defaultDescriptionSections
  );
  const [lecteursAgents, setLecteursAgents] = useState<LecteurAgentPayload[]>([]);
  const [juryFilter, setJuryFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(mode === "create");

  const sectionRefDisplay = sectionSlug;

  const programmeLabel = useCallback(
    (slug: string) => programmes.find((p) => p.slug === slug)?.designation ?? slug,
    [programmes]
  );

  const juryFiltered = useMemo(() => {
    const q = juryFilter.trim().toLowerCase();
    if (!q) return juryRechercheMembers;
    return juryRechercheMembers.filter(
      (m) =>
        m.nom.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.matricule.toLowerCase().includes(q)
    );
  }, [juryRechercheMembers, juryFilter]);

  const resolveLecteursFromDetail = useCallback(
    (agents: LecteurAgentPayload[]): LecteurAgentPayload[] => {
      return agents.map((l) => {
        if (l.id && juryRechercheMembers.some((m) => m.id === l.id)) return l;
        if (l.email) {
          const m = juryRechercheMembers.find((j) => j.email && j.email === l.email);
          if (m)
            return {
              id: m.id,
              nom: l.nom || m.nom,
              email: l.email || m.email,
              matricule: l.matricule || m.matricule,
            };
        }
        return l;
      });
    },
    [juryRechercheMembers]
  );

  useEffect(() => {
    if (mode === "create") {
      setStep(1);
      setForm({
        ...emptyForm(),
        brandingSectionLabel: sectionDesignation,
      });
      setDescriptionSections(defaultDescriptionSections());
      setLecteursAgents([]);
      setJuryFilter("");
      setError(null);
      setLoadError(null);
      setHydrated(true);
      return;
    }
    if (!editingId) return;
    setHydrated(false);
    setLoadError(null);
    startTransition(async () => {
      try {
        const detail = await getOrganisateurSujetResourceAction({ sectionSlug, id: editingId });
        setForm({
          designation: detail.designation,
          amount: String(detail.amount),
          currency: detail.currency || "USD",
          programmeSlug: detail.programmeSlug,
          brandingSectionLabel: detail.brandingSectionLabel || sectionDesignation,
          brandingContact: detail.brandingContact,
          brandingEmail: detail.brandingEmail,
          brandingAdresse: detail.brandingAdresse,
        });
        const fromApi =
          detail.descriptionSections.length > 0
            ? detail.descriptionSections
            : defaultDescriptionSections();
        setDescriptionSections(fromApi);
        let lect: LecteurAgentPayload[] =
          detail.lecteursAgents.length > 0
            ? detail.lecteursAgents
            : detail.lecteursLabel
              ? detail.lecteursLabel.split(",").map((nom) => ({
                  id: "",
                  nom: nom.trim(),
                  email: "",
                  matricule: "",
                }))
              : [];
        lect = resolveLecteursFromDetail(lect);
        setLecteursAgents(lect);
        setStep(1);
        setJuryFilter("");
        setHydrated(true);
      } catch (e) {
        setLoadError((e as Error).message);
        setHydrated(true);
      }
    });
  }, [mode, editingId, sectionSlug, sectionDesignation, resolveLecteursFromDetail]);

  const toggleJuryMember = (m: JuryRechercheMemberOption) => {
    setLecteursAgents((prev) => {
      if (prev.some((p) => p.id === m.id)) return prev.filter((p) => p.id !== m.id);
      return [...prev, { id: m.id, nom: m.nom, email: m.email, matricule: m.matricule }];
    });
  };

  const removeLecteurAt = (index: number) => {
    setLecteursAgents((prev) => prev.filter((_, i) => i !== index));
  };

  const goSubmit = () => {
    setError(null);
    if (lecteursAgents.length === 0 || !lecteursAgents.some((l) => l.nom.trim())) {
      setError("Sélectionnez au moins un lecteur parmi le jury de recherche.");
      return;
    }
    if (lecteursAgents.some((l) => !l.id || !juryRechercheMembers.some((m) => m.id === l.id))) {
      setError("Chaque lecteur doit être membre du jury de recherche (réessayez la sélection).");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          sectionSlug,
          designation: form.designation,
          descriptionSections,
          amount: Number(form.amount) || 0,
          currency: form.currency,
          programmeSlug: form.programmeSlug,
          lecteurs: lecteursAgents.filter((l) => l.nom.trim() && l.id),
          brandingSectionLabel: form.brandingSectionLabel.trim() || sectionDesignation,
          brandingContact: form.brandingContact,
          brandingEmail: form.brandingEmail,
          brandingAdresse: form.brandingAdresse,
        };
        if (mode === "create") {
          await createOrganisateurSujetResourceAction(payload);
        } else if (editingId) {
          await updateOrganisateurSujetResourceAction({ ...payload, id: editingId });
        }
        onSaved();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const canPrev = step > 1;

  const stepMeta: ResourceStepMeta[] = [
    { num: 1, label: "Infos & programme", icon: "solar:document-text-bold-duotone" },
    { num: 2, label: "Description", icon: "solar:notes-bold-duotone" },
    { num: 3, label: "Branding", icon: "solar:tag-bold-duotone" },
    { num: 4, label: "Lecteurs", icon: "solar:users-group-rounded-bold-duotone" },
  ];

  if (!hydrated && mode === "edit") {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Icon icon="svg-spinners:ring-resize" className="size-8" />
          <p className="text-sm">Chargement de la ressource…</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 dark:border-rose-900 dark:bg-rose-950/30">
        <p className="text-sm text-rose-800 dark:text-rose-100">{loadError}</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
        >
          Retour à la liste
        </button>
      </section>
    );
  }

  return (
    <ResourceMultiStepFormShell
      headerTitle={mode === "create" ? "Nouvelle ressource sujet" : "Modifier la ressource"}
      mode={mode}
      steps={stepMeta}
      activeStep={step}
      error={error}
      onCancel={onCancel}
      footer={
        <>
          <button
            type="button"
            disabled={!canPrev || pending}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-gray-600"
          >
            <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
            Retour
          </button>
          <div className="flex gap-2">
            {step < 4 ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  if (step === 1) {
                    if (!form.designation.trim()) {
                      setError("La désignation est requise.");
                      return;
                    }
                    if (!form.programmeSlug.trim()) {
                      setError("Sélectionnez un programme de la section.");
                      return;
                    }
                  }
                  if (step === 2 && !descriptionHasBody(descriptionSections)) {
                    setError("Ajoutez au moins une ligne de contenu dans la description.");
                    return;
                  }
                  if (step === 3) {
                    if (!form.brandingContact.trim()) {
                      setError("Le contact (branding) est requis.");
                      return;
                    }
                    if (!form.brandingEmail.trim()) {
                      setError("L’e-mail du branding est requis.");
                      return;
                    }
                    if (!form.brandingAdresse.trim()) {
                      setError("L’adresse du branding est requise.");
                      return;
                    }
                  }
                  setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
                }}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-darkprimary dark:bg-primary dark:text-white"
              >
                Suivant
                <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={goSubmit}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-darkprimary dark:bg-primary dark:text-white"
              >
                <Icon icon="solar:check-circle-bold" className="h-4 w-4" />
                {pending ? "Envoi…" : mode === "create" ? "Enregistrer" : "Mettre à jour"}
              </button>
            )}
          </div>
        </>
      }
    >
      {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <Icon icon="solar:text-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                Désignation
              </label>
              <input
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Icon icon="solar:wad-of-money-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                  Montant
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Icon icon="solar:global-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                  Devise
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                <Icon icon="solar:diploma-bold-duotone" className="h-4 w-4 text-primary" />
                Programme de la section
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {programmes.map((p) => {
                  const selected = form.programmeSlug === p.slug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, programmeSlug: p.slug }))}
                      className={`group relative flex flex-col items-stretch gap-3 overflow-hidden rounded-2xl border-2 p-5 text-left shadow-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] ${
                        selected
                          ? "border-primary bg-gradient-to-br from-primary/[0.12] via-white to-sky-50/50 ring-2 ring-primary/25 dark:from-primary/20 dark:via-gray-900 dark:to-gray-900"
                          : "border-gray-200/90 bg-white hover:border-primary/35 dark:border-gray-700 dark:bg-gray-900/80 dark:hover:border-primary/40"
                      }`}
                    >
                      <span className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 rounded-full bg-primary/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 dark:bg-primary/20" />
                      <span className="flex w-full items-start justify-between gap-3">
                        <span className="line-clamp-2 text-sm font-bold leading-snug text-midnight_text dark:text-white">
                          {p.designation}
                        </span>
                        {selected ? (
                          <Icon
                            icon="solar:check-circle-bold"
                            className="h-6 w-6 shrink-0 text-primary drop-shadow-sm transition-transform duration-200"
                            aria-hidden
                          />
                        ) : (
                          <Icon icon="solar:diploma-linear" className="h-6 w-6 shrink-0 text-gray-300 dark:text-gray-600" />
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          <Icon icon="solar:hashtag-bold-duotone" className="h-3.5 w-3.5" />
                          <code className="font-mono text-xs">{p.slug}</code>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary dark:bg-primary/25 dark:text-sky-100">
                          <Icon icon="solar:book-bold-duotone" className="h-3.5 w-3.5" />
                          {p.credits} crédit{p.credits !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Icon icon="solar:info-circle-linear" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Le slug est envoyé comme{" "}
                  <code className="rounded bg-gray-100 px-0.5 font-mono dark:bg-gray-800">matiere.reference</code>, la
                  désignation et les crédits du programme comme{" "}
                  <code className="rounded bg-gray-100 px-0.5 font-mono dark:bg-gray-800">matiere.designation</code> et{" "}
                  <code className="rounded bg-gray-100 px-0.5 font-mono dark:bg-gray-800">matiere.credit</code>.
                </span>
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <SujetResourceDescriptionEditor
            value={descriptionSections}
            onChange={setDescriptionSections}
            disabled={pending}
          />
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-midnight_text dark:border-primary/35 dark:bg-primary/10 dark:text-gray-100">
              <p className="flex items-center gap-2 font-semibold text-primary dark:text-sky-200">
                <Icon icon="solar:info-circle-bold-duotone" className="h-4 w-4" />
                Référence section et chef de section sont appliqués automatiquement à l’enregistrement. Renseignez le
                contact public, l’e-mail et l’adresse affichés sur les documents.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Icon icon="solar:link-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                  sectionRef (automatique)
                </label>
                <input
                  readOnly
                  value={sectionRefDisplay}
                  className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Icon icon="solar:user-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                  Chef de section (automatique)
                </label>
                <input
                  readOnly
                  value={chefSection.name || "— (non renseigné en base section)"}
                  className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                {chefSection.telephone ? (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Tél. agent : {chefSection.telephone} (indicatif pour votre contact officiel ci-dessous)
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <Icon icon="solar:tag-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                Libellé section (branding.section)
              </label>
              <input
                value={form.brandingSectionLabel}
                onChange={(e) => setForm((f) => ({ ...f, brandingSectionLabel: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <Icon icon="solar:phone-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                Contact (téléphone ou personne à contacter) — requis
              </label>
              <input
                value={form.brandingContact}
                onChange={(e) => setForm((f) => ({ ...f, brandingContact: e.target.value }))}
                placeholder={chefSection.telephone ? `ex. ${chefSection.telephone}` : "Numéro ou service…"}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <Icon icon="solar:letter-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                E-mail (branding) — requis
              </label>
              <input
                type="email"
                value={form.brandingEmail}
                onChange={(e) => setForm((f) => ({ ...f, brandingEmail: e.target.value }))}
                placeholder={chefSection.email || "contact.section@…"}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <Icon icon="solar:map-point-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                Adresse — requise
              </label>
              <textarea
                rows={3}
                value={form.brandingAdresse}
                onChange={(e) => setForm((f) => ({ ...f, brandingAdresse: e.target.value }))}
                placeholder="Adresse postale ou campus…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            {juryRechercheMembers.length === 0 ? (
              <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <Icon icon="solar:danger-triangle-bold-duotone" className="h-5 w-5 shrink-0" />
                <p>
                  Le jury de recherche n&apos;est pas configuré pour cette section. Configurez-le pour pouvoir valider ou
                  modifier les lecteurs, puis rechargez cette page.
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 dark:border-primary/35 dark:bg-primary/10">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                <Icon icon="solar:users-group-rounded-bold-duotone" className="h-4 w-4 text-primary" />
                Lecteurs — jury de recherche uniquement
              </p>
              <label className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                <Icon icon="solar:magnifer-bold-duotone" className="h-3.5 w-3.5" />
                Filtrer les membres
              </label>
              <input
                value={juryFilter}
                onChange={(e) => setJuryFilter(e.target.value)}
                placeholder="Nom, e-mail ou matricule…"
                className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {juryFiltered.length === 0 ? (
                  <li className="text-xs text-gray-500">Aucun membre ne correspond au filtre.</li>
                ) : (
                  juryFiltered.map((m) => {
                    const selected = lecteursAgents.some((l) => l.id === m.id);
                    const rb = roleBadge(m.role);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggleJuryMember(m)}
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                            selected
                              ? "border-primary bg-primary/10 ring-1 ring-primary dark:bg-primary/15"
                              : "border-gray-200 hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800/80"
                          }`}
                        >
                          <Icon
                            icon={selected ? "solar:check-circle-bold" : "solar:circle-linear"}
                            className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-primary" : "text-gray-300"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-midnight_text dark:text-white">{m.nom}</span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${rb.className}`}
                              >
                                {rb.label}
                              </span>
                            </div>
                            {m.email ? (
                              <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                                <Icon icon="solar:letter-bold-duotone" className="h-3.5 w-3.5 shrink-0" />
                                {m.email}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                <Icon icon="solar:user-check-rounded-bold-duotone" className="h-4 w-4" />
                Sélection ({lecteursAgents.length})
              </p>
              <ul className="space-y-2">
                {lecteursAgents.length === 0 ? (
                  <li className="text-xs text-gray-500">Aucun lecteur sélectionné.</li>
                ) : (
                  lecteursAgents.map((l, idx) => (
                    <li
                      key={`${l.id}-${idx}`}
                      className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">{l.nom}</p>
                        {l.email ? (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                            <Icon icon="solar:letter-bold-duotone" className="h-3.5 w-3.5 shrink-0" />
                            {l.email}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLecteurAt(idx)}
                        className="shrink-0 text-rose-600"
                        aria-label="Retirer"
                      >
                        <Icon icon="solar:close-circle-bold-duotone" className="h-5 w-5" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="space-y-2 rounded-xl border border-gray-100 p-3 text-sm dark:border-gray-800">
              <p className="flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                <Icon icon="solar:clipboard-list-bold-duotone" className="h-4 w-4" />
                Récapitulatif
              </p>
              <p>
                <span className="text-gray-500">Contact / e-mail / adresse :</span> {form.brandingContact} —{" "}
                {form.brandingEmail} — {form.brandingAdresse}
              </p>
              <p>
                <span className="text-gray-500">Désignation :</span> {form.designation}
              </p>
              <p>
                <span className="text-gray-500">Montant :</span> {form.amount} {form.currency}
              </p>
              <p>
                <span className="text-gray-500">Programme :</span>{" "}
                {programmeLabel(form.programmeSlug) || form.programmeSlug}
              </p>
              <p>
                <span className="text-gray-500">Lecteurs :</span>{" "}
                {lecteursAgents.map((l) => l.nom).filter(Boolean).join(", ") || "—"}
              </p>
            </div>
          </div>
        ) : null}
    </ResourceMultiStepFormShell>
  );
}
