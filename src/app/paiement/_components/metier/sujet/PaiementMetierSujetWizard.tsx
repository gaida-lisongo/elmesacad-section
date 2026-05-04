"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { getEtudiantSujetCommandeAction } from "@/actions/sujetCommandeActions";
import { submitOrderSujetResearchAction } from "@/actions/sujetOrderSubmitAction";
import type { OrderSujetSection, OrderSujetStudentPayload } from "@/lib/sujet/orderSujetTypes";
import {
  emptySection,
  ensureSectionsOrDefault,
  multilineToStringArray,
  normalizeSectionsForApi,
  stringArrayToMultiline,
} from "@/lib/sujet/orderSujetTypes";
import SujetAgentPickField, { formatAgentDirecteurLabel } from "@/app/paiement/_components/metier/sujet/SujetAgentPickField";
import SujetOrderSectionEditor from "@/app/paiement/_components/metier/sujet/SujetOrderSectionEditor";

const STEPS = [
  { n: 1, label: "Description" },
  { n: 2, label: "Méthodologie" },
  { n: 3, label: "Résultats attendus" },
  { n: 4, label: "Chronogrammes" },
  { n: 5, label: "Références" },
] as const;

type Props = {
  localCommandeId: string;
  etudiantServiceOrderId: string | undefined;
  onSubmitted: () => void;
};

function defaultPayload(): OrderSujetStudentPayload {
  return {
    titre: "",
    directeur: "",
    co_directeur: "",
    thematique: "",
    justification: [],
    problematique: [],
    objectif: [],
    methodologie: [emptySection()],
    resultats_attendus: [emptySection()],
    chronogrammes: [emptySection()],
    references: [emptySection()],
  };
}

export default function PaiementMetierSujetWizard({
  localCommandeId,
  etudiantServiceOrderId,
  onSubmitted,
}: Props) {
  const orderId = String(etudiantServiceOrderId ?? "").trim();
  const [step, setStep] = useState(1);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<OrderSujetStudentPayload>(() => defaultPayload());
  const [justificationDraft, setJustificationDraft] = useState("");
  const [problematiqueDraft, setProblematiqueDraft] = useState("");
  const [objectifDraft, setObjectifDraft] = useState("");

  const refreshRemote = useCallback(async () => {
    if (!orderId) return;
    setLoadingRemote(true);
    setLoadError(null);
    try {
      const res = await getEtudiantSujetCommandeAction(orderId);
      console.log("[sujet][wizard] préremplissage GET", { orderId, ok: res.ok });
      if (!res.ok) {
        setLoadError(res.message);
        return;
      }
      setForm(res.payload);
      setJustificationDraft(stringArrayToMultiline(res.payload.justification));
      setProblematiqueDraft(stringArrayToMultiline(res.payload.problematique));
      setObjectifDraft(stringArrayToMultiline(res.payload.objectif));
    } finally {
      setLoadingRemote(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refreshRemote();
  }, [refreshRemote]);

  const validateStep1 = (): string | null => {
    if (!form.titre.trim()) return "Indiquez le titre du sujet.";
    if (!form.directeur.trim()) return "Choisissez le directeur de recherche.";
    if (!form.co_directeur.trim()) return "Choisissez le co-directeur.";
    if (!form.thematique.trim()) return "Indiquez la thématique.";
    if (multilineToStringArray(justificationDraft).length === 0) return "Ajoutez au moins une ligne à la justification.";
    if (multilineToStringArray(problematiqueDraft).length === 0) return "Ajoutez au moins une ligne à la problématique.";
    if (multilineToStringArray(objectifDraft).length === 0) return "Ajoutez au moins une ligne aux objectifs.";
    return null;
  };

  const validateSections = (sections: OrderSujetSection[], label: string): string | null => {
    const n = normalizeSectionsForApi(sections);
    if (n.length === 0) return `Ajoutez au moins une section valide pour : ${label}.`;
    return null;
  };

  const goNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        window.alert(err);
        return;
      }
    }
    if (step === 2) {
      const err = validateSections(form.methodologie, "méthodologie");
      if (err) {
        window.alert(err);
        return;
      }
    }
    if (step === 3) {
      const err = validateSections(form.resultats_attendus, "résultats attendus");
      if (err) {
        window.alert(err);
        return;
      }
    }
    if (step === 4) {
      const err = validateSections(form.chronogrammes, "chronogrammes");
      if (err) {
        window.alert(err);
        return;
      }
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const buildSubmitPayload = (): OrderSujetStudentPayload => ({
    titre: form.titre.trim(),
    directeur: form.directeur.trim(),
    co_directeur: form.co_directeur.trim(),
    thematique: form.thematique.trim(),
    justification: multilineToStringArray(justificationDraft),
    problematique: multilineToStringArray(problematiqueDraft),
    objectif: multilineToStringArray(objectifDraft),
    methodologie: ensureSectionsOrDefault(form.methodologie, "Méthodologie"),
    resultats_attendus: ensureSectionsOrDefault(form.resultats_attendus, "Résultats attendus"),
    chronogrammes: ensureSectionsOrDefault(form.chronogrammes, "Chronogramme"),
    references: ensureSectionsOrDefault(form.references, "Références"),
  });

  const handleSubmit = async () => {
    const err = validateSections(form.references, "références");
    if (err) {
      window.alert(err);
      return;
    }
    const localId = String(localCommandeId ?? "").trim();
    if (!localId) {
      window.alert("Référence commande locale manquante.");
      return;
    }
    const payload = buildSubmitPayload();
    console.log("[sujet][wizard] soumission POST /commandes + clôture locale", {
      localCommandeId: localId,
      prefillOrderId: orderId || undefined,
    });
    setSaving(true);
    try {
      const res = await submitOrderSujetResearchAction({
        localCommandeId: localId,
        payload,
      });
      if (!res.ok) {
        console.warn("[sujet][wizard] échec submit", res);
        window.alert(res.message);
        return;
      }
      console.log("[sujet][wizard] submit OK, rafraîchissement page", res.microserviceBody);
      window.alert("Projet transmis. La commande est clôturée côté marketplace.");
      onSubmitted();
    } finally {
      setSaving(false);
    }
  };


  return (
    <div
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-white to-primary/[0.06] p-4 shadow-sm dark:border-primary/25 dark:from-darklight dark:via-darklight dark:to-primary/10 sm:p-5"
      data-testid="paiement-metier-sujet-wizard"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/15 pb-3 dark:border-primary/20">
        <div>
          <h3 className="text-base font-bold text-midnight_text dark:text-white">Projet de recherche — sujet</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Complétez les 5 étapes puis soumettez : création de la commande côté service étudiant (POST{" "}
            <span className="font-mono">/commandes</span>) puis passage de votre commande marketplace en « clôturée ».
          </p>
        </div>
        <button
          type="button"
          disabled={loadingRemote || !orderId}
          title={!orderId ? "Préremplissage indisponible tant qu’aucune commande service n’est liée." : undefined}
          onClick={() => void refreshRemote()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Icon icon="solar:refresh-bold" className="text-base" aria-hidden />
          {loadingRemote ? "…" : "Importer brouillon"}
        </button>
      </div>

      {!orderId ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          Aucun identifiant de commande service étudiant pour l’instant : c’est normal après paiement. La commande
          service sera créée à la soumission du formulaire.
        </p>
      ) : null}

      {loadError ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          {loadError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              step === s.n
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4 text-sm">
        {step === 1 ? (
          <div className="space-y-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Titre du sujet
              <input
                type="text"
                value={form.titre}
                onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                required
              />
            </label>

            <SujetAgentPickField
              id="sujet-directeur-search"
              label="Directeur de recherche (agent INBTP)"
              value={form.directeur}
              onPick={(a) => {
                setForm((f) => ({ ...f, directeur: formatAgentDirecteurLabel(a) }));
              }}
              onClear={() => {
                setForm((f) => ({ ...f, directeur: "" }));
              }}
            />

            <SujetAgentPickField
              id="sujet-co-directeur-search"
              label="Co-directeur (agent INBTP)"
              value={form.co_directeur}
              onPick={(a) => {
                setForm((f) => ({ ...f, co_directeur: formatAgentDirecteurLabel(a) }));
              }}
              onClear={() => {
                setForm((f) => ({ ...f, co_directeur: "" }));
              }}
            />

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Thématique
              <textarea
                value={form.thematique}
                onChange={(e) => setForm((f) => ({ ...f, thematique: e.target.value }))}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Justification (une idée par ligne ; retours à la ligne autorisés)
              <textarea
                value={justificationDraft}
                onChange={(e) => setJustificationDraft(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Problématique
              <textarea
                value={problematiqueDraft}
                onChange={(e) => setProblematiqueDraft(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Objectifs
              <textarea
                value={objectifDraft}
                onChange={(e) => setObjectifDraft(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <SujetOrderSectionEditor
            label="Méthodologie"
            sections={form.methodologie}
            onChange={(methodologie) => setForm((f) => ({ ...f, methodologie }))}
          />
        ) : null}

        {step === 3 ? (
          <SujetOrderSectionEditor
            label="Résultats attendus"
            sections={form.resultats_attendus}
            onChange={(resultats_attendus) => setForm((f) => ({ ...f, resultats_attendus }))}
          />
        ) : null}

        {step === 4 ? (
          <SujetOrderSectionEditor
            label="Chronogrammes"
            sections={form.chronogrammes}
            onChange={(chronogrammes) => setForm((f) => ({ ...f, chronogrammes }))}
          />
        ) : null}

        {step === 5 ? (
          <SujetOrderSectionEditor
            label="Références"
            sections={form.references}
            onChange={(references) => setForm((f) => ({ ...f, references }))}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button
          type="button"
          disabled={step <= 1}
          onClick={goPrev}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Précédent
        </button>
        <div className="flex flex-wrap gap-2">
          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-darkprimary"
            >
              Suivant
              <Icon icon="solar:arrow-right-linear" className="text-lg" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-darkprimary disabled:opacity-50"
            >
              <Icon icon="solar:diskette-bold" className="text-lg" aria-hidden />
              {saving ? "Envoi…" : "Soumettre le projet (service étudiant)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
