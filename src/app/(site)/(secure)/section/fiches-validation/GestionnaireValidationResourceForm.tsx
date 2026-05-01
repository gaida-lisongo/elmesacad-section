"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type { DescriptionSectionInput } from "@/actions/organisateurSujetResources";
import {
  createGestionnaireValidationResourceAction,
  getGestionnaireValidationResourceAction,
  updateGestionnaireValidationResourceAction,
} from "@/actions/gestionnaireValidationResources";
import ResourceMultiStepFormShell, {
  type ResourceStepMeta,
} from "@/components/secure/etudiant-resources/ResourceMultiStepFormShell";
import { SujetResourceDescriptionEditor } from "../recherche/ressources-sujets/SujetResourceDescriptionEditor";

type ProgrammeOption = { slug: string; designation: string; credits: number };
type AnneeOption = { slug: string; designation: string; debut: number; fin: number };

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
  sectionCycle: string;
  programmes: ProgrammeOption[];
  annees: AnneeOption[];
  chefSection: ChefSectionDefaults;
  onCancel: () => void;
  onSaved: () => void;
};

const CURRENCIES = ["USD", "CDF"] as const;
type Step = 1 | 2 | 3 | 4;

const STEPS: ResourceStepMeta[] = [
  { num: 1, label: "Général", icon: "solar:document-text-bold-duotone" },
  { num: 2, label: "Description", icon: "solar:notes-bold-duotone" },
  { num: 3, label: "Programme & année", icon: "solar:diploma-bold-duotone" },
  { num: 4, label: "Branding", icon: "solar:buildings-3-bold-duotone" },
];

function emptyForm() {
  return {
    designation: "",
    amount: "0",
    currency: "USD",
    programmeSlug: "",
    anneeSlug: "",
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

export default function GestionnaireValidationResourceForm({
  mode,
  editingId,
  sectionSlug,
  sectionDesignation,
  sectionCycle,
  programmes,
  annees,
  chefSection,
  onCancel,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(emptyForm);
  const [descriptionSections, setDescriptionSections] = useState<DescriptionSectionInput[]>(
    defaultDescriptionSections
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(mode === "create");

  useEffect(() => {
    if (mode === "create") {
      setStep(1);
      setForm({
        ...emptyForm(),
        brandingSectionLabel: sectionDesignation,
        brandingContact: chefSection.telephone,
        brandingEmail: chefSection.email,
      });
      setDescriptionSections(defaultDescriptionSections());
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
        const detail = await getGestionnaireValidationResourceAction({ sectionSlug, id: editingId });
        setForm({
          designation: detail.designation,
          amount: String(detail.amount),
          currency: detail.currency || "USD",
          programmeSlug: detail.programmeSlug,
          anneeSlug: detail.anneeSlug,
          brandingSectionLabel: detail.brandingSectionLabel || sectionDesignation,
          brandingContact: detail.brandingContact,
          brandingEmail: detail.brandingEmail,
          brandingAdresse: detail.brandingAdresse,
        });
        setDescriptionSections(
          detail.descriptionSections.length > 0 ? detail.descriptionSections : defaultDescriptionSections()
        );
        setStep(1);
        setError(null);
        setHydrated(true);
      } catch (e) {
        setLoadError((e as Error).message);
        setHydrated(true);
      }
    });
  }, [mode, editingId, sectionSlug, sectionDesignation, chefSection.email, chefSection.telephone]);

  const validateStep = (s: Step): boolean => {
    if (s === 1) {
      if (!form.designation.trim()) {
        setError("Indiquez une désignation.");
        return false;
      }
      if (!form.amount.trim() || Number.isNaN(Number(form.amount)) || Number(form.amount) < 0) {
        setError("Montant invalide.");
        return false;
      }
    }
    if (s === 2) {
      if (!descriptionHasBody(descriptionSections)) {
        setError("Ajoutez au moins une ligne de contenu dans la description.");
        return false;
      }
    }
    if (s === 3) {
      if (!form.programmeSlug.trim()) {
        setError("Choisissez un programme.");
        return false;
      }
      if (!form.anneeSlug.trim()) {
        setError("Choisissez une année académique.");
        return false;
      }
    }
    if (s === 4) {
      if (!form.brandingContact.trim() || !form.brandingEmail.trim() || !form.brandingAdresse.trim()) {
        setError("Renseignez contact, e-mail et adresse de la section.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < 4) setStep((step + 1) as Step);
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
  };

  const selectedAnnee = annees.find((a) => a.slug === form.anneeSlug);

  const submit = useCallback(() => {
    if (!validateStep(4)) return;
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          sectionSlug,
          sectionCycle,
          designation: form.designation.trim(),
          descriptionSections,
          amount: Number(form.amount),
          currency: form.currency,
          programmeSlug: form.programmeSlug.trim(),
          anneeSlug: form.anneeSlug.trim(),
          anneeDebut: selectedAnnee ? String(selectedAnnee.debut) : "",
          anneeFin: selectedAnnee ? String(selectedAnnee.fin) : "",
          brandingSectionLabel: form.brandingSectionLabel.trim() || sectionDesignation,
          brandingContact: form.brandingContact.trim(),
          brandingEmail: form.brandingEmail.trim(),
          brandingAdresse: form.brandingAdresse.trim(),
        };
        if (mode === "create") {
          await createGestionnaireValidationResourceAction(payload);
        } else if (editingId) {
          await updateGestionnaireValidationResourceAction({ ...payload, id: editingId });
        }
        onSaved();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }, [
    mode,
    editingId,
    sectionSlug,
    sectionCycle,
    sectionDesignation,
    form,
    descriptionSections,
    selectedAnnee,
    onSaved,
  ]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Icon icon="svg-spinners:ring-resize" className="mr-2 h-5 w-5" />
        Chargement…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
        {loadError}
      </div>
    );
  }

  return (
    <ResourceMultiStepFormShell
      headerTitle={mode === "create" ? "Nouvelle fiche de validation" : "Modifier la fiche"}
      mode={mode}
      steps={STEPS}
      activeStep={step}
      error={error}
      onCancel={onCancel}
      footer={
        <>
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                type="button"
                disabled={pending}
                onClick={goBack}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium dark:border-gray-600"
              >
                Précédent
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            {step < 4 ? (
              <button
                type="button"
                disabled={pending}
                onClick={goNext}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Enregistrement…" : mode === "create" ? "Créer" : "Enregistrer"}
              </button>
            )}
          </div>
        </>
      }
    >
      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Désignation</label>
            <input
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              placeholder="Ex. Fiche de validation de stage"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Montant</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Devise</label>
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <SujetResourceDescriptionEditor value={descriptionSections} onChange={setDescriptionSections} />
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Classe (cycle section)</strong> envoyée au service :{" "}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{sectionCycle || "—"}</code>
          </p>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Programme</label>
            <select
              value={form.programmeSlug}
              onChange={(e) => setForm((f) => ({ ...f, programmeSlug: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="">— Sélectionner —</option>
              {programmes.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.designation} ({p.credits} cr.)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Année académique</label>
            <select
              value={form.anneeSlug}
              onChange={(e) => setForm((f) => ({ ...f, anneeSlug: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="">— Sélectionner —</option>
              {annees.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.designation} ({a.debut}–{a.fin})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Libellé section (branding)</label>
            <input
              value={form.brandingSectionLabel}
              onChange={(e) => setForm((f) => ({ ...f, brandingSectionLabel: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Contact (téléphone)</label>
            <input
              value={form.brandingContact}
              onChange={(e) => setForm((f) => ({ ...f, brandingContact: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">E-mail</label>
            <input
              type="email"
              value={form.brandingEmail}
              onChange={(e) => setForm((f) => ({ ...f, brandingEmail: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Adresse</label>
            <textarea
              rows={3}
              value={form.brandingAdresse}
              onChange={(e) => setForm((f) => ({ ...f, brandingAdresse: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      ) : null}
    </ResourceMultiStepFormShell>
  );
}
