"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { creditsMatiereDepasseUnite } from "@/lib/validation/creditsCoherence";

type MatiereDraft = { key: string; designation: string; credits: string; code: string };

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  filiereId: string;
  semestreId: string;
  semestreLabel: string;
  onDone: () => void;
};

/**
 * Création UE puis matières : étape 1 = unité, étape 2 = liste de matières (insertMany côté API).
 */
export default function UniteMatiereWizardModal({
  open,
  onClose,
  filiereId,
  semestreId,
  semestreLabel,
  onDone,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdUniteId, setCreatedUniteId] = useState<string | null>(null);
  const [designation, setDesignation] = useState("");
  const [credits, setCredits] = useState("");
  const [code, setCode] = useState("");
  const [matiereDrafts, setMatiereDrafts] = useState<MatiereDraft[]>([
    { key: newKey(), designation: "", credits: "", code: "" },
  ]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setErr(null);
    setSaving(false);
    setCreatedUniteId(null);
    setDesignation("");
    setCredits("");
    setCode("");
    setMatiereDrafts([{ key: newKey(), designation: "", credits: "", code: "" }]);
  }, [open, filiereId, semestreId]);

  const close = () => {
    if (saving) return;
    onClose();
  };

  const submitStep1 = async () => {
    const des = designation.trim();
    const c = Number.parseFloat(credits.replace(",", "."));
    const cd = code.trim().toUpperCase();
    if (!des || !cd) {
      setErr("Désignation et code UE sont obligatoires.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setErr("Crédits UE invalides.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/filieres/${filiereId}/semestres/${semestreId}/unites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: des,
          credits: c,
          code: cd,
          description: [],
        }),
      });
      const j = (await res.json()) as { message?: string; data?: { _id?: string } };
      if (!res.ok) throw new Error(j.message || "Création UE impossible");
      const id = j.data?._id != null ? String(j.data._id) : "";
      if (!id) throw new Error("Réponse invalide");
      setCreatedUniteId(id);
      setStep(2);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitStep2 = async () => {
    if (!createdUniteId) {
      setErr("Identifiant UE manquant.");
      return;
    }
    const rows = matiereDrafts
      .map((d) => ({
        designation: d.designation.trim(),
        credits: Number.parseFloat(d.credits.replace(",", ".")),
        code: d.code.trim() || undefined,
      }))
      .filter((r) => r.designation.length > 0 && Number.isFinite(r.credits) && r.credits >= 0);

    if (rows.length > 0) {
      const capUe = Number.parseFloat(credits.replace(",", "."));
      if (!Number.isFinite(capUe) || capUe < 0) {
        setErr("Crédits de l’unité invalides — repassez à l’étape 1.");
        return;
      }
      const sumRows = rows.reduce((s, r) => s + r.credits, 0);
      if (creditsMatiereDepasseUnite(capUe, sumRows)) {
        setErr(
          `La somme des cours (${sumRows} cr.) dépasse les crédits de l’unité (${capUe} cr.). Ajustez les lignes ou l’unité.`
        );
        return;
      }
    }

    setSaving(true);
    setErr(null);
    try {
      if (rows.length > 0) {
        const res = await fetch(`/api/unites/${createdUniteId}/matieres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matieres: rows.map((r) => ({
              designation: r.designation,
              credits: r.credits,
              code: r.code,
              description: [],
            })),
          }),
        });
        const j = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(j.message || "Création des matières impossible");
      }
      onDone();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unite-wizard-title"
    >
      <div className="max-h-[92vh] w-full max-w-[min(42rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{semestreLabel}</p>
            <h2 id="unite-wizard-title" className="text-lg font-semibold text-midnight_text dark:text-white">
              {step === 1 ? "Nouvelle unité — étape 1 / 2" : "Matières — étape 2 / 2"}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fermer"
          >
            <Icon icon="solar:close-circle-linear" className="size-6" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          {err && (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {err}
            </p>
          )}
          {step === 1 ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                Désignation UE *
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                Code UE * (unique)
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm uppercase dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                Crédits UE *
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Ajoutez une ou plusieurs matières pour cette unité (optionnel : vous pouvez terminer sans matière).
              </p>
              <div className="space-y-2">
                {matiereDrafts.map((d, i) => (
                  <div
                    key={d.key}
                    className="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-[1fr_5rem_6rem_auto]"
                  >
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Matière {i + 1} — libellé *
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={d.designation}
                        onChange={(e) =>
                          setMatiereDrafts((prev) =>
                            prev.map((x) => (x.key === d.key ? { ...x, designation: e.target.value } : x))
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Créd. *
                      <input
                        type="text"
                        inputMode="decimal"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={d.credits}
                        onChange={(e) =>
                          setMatiereDrafts((prev) =>
                            prev.map((x) => (x.key === d.key ? { ...x, credits: e.target.value } : x))
                          )
                        }
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Code
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={d.code}
                        onChange={(e) =>
                          setMatiereDrafts((prev) =>
                            prev.map((x) => (x.key === d.key ? { ...x, code: e.target.value } : x))
                          )
                        }
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={matiereDrafts.length <= 1}
                        onClick={() =>
                          setMatiereDrafts((prev) =>
                            prev.length <= 1 ? prev : prev.filter((x) => x.key !== d.key)
                          )
                        }
                        className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setMatiereDrafts((prev) => [...prev, { key: newKey(), designation: "", credits: "", code: "" }])
                }
                className="inline-flex rounded-md border border-[#082b1c] px-3 py-1.5 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
              >
                + Matière
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-700">
          <button
            type="button"
            disabled={saving}
            onClick={close}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
          >
            Annuler
          </button>
          {step === 1 ? (
            <button
              type="button"
              disabled={saving || !designation.trim() || !code.trim()}
              onClick={() => void submitStep1()}
              className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
            >
              {saving ? "Création…" : "Suivant : matières"}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submitStep2()}
              className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
            >
              {saving ? "Enregistrement…" : "Terminer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
