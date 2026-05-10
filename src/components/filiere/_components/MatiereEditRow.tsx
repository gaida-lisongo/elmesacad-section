"use client";
import { useEffect, useState } from "react";
import { DescriptionBloc, MatiereLite } from "../FiliereStructureClient";
import { cloneDescription, DescriptionBlocsEditor, parseDescriptionForSave } from "@/components/Layout/DescriptionBlocsEditor";
import { creditsMatiereDepasseUnite } from "@/lib/validation/creditsCoherence";


export default function MatiereEditRow({
    matiere,
    uniteId,
    creditsPlafondUnite,
    creditsAutresMatieres,
    onAfterChange,
  }: {
    matiere: MatiereLite;
    uniteId: string;
    creditsPlafondUnite: number;
    creditsAutresMatieres: number;
    onAfterChange: () => Promise<void>;
  }) {
    const [designation, setDesignation] = useState(matiere.designation);
    const [credits, setCredits] = useState(String(matiere.credits ?? ""));
    const [code, setCode] = useState(matiere.code ?? "");
    const [description, setDescription] = useState<DescriptionBloc[]>(() => cloneDescription(matiere.description));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [localErr, setLocalErr] = useState<string | null>(null);
  
    useEffect(() => {
      setDesignation(matiere.designation);
      setCredits(String(matiere.credits ?? ""));
      setCode(matiere.code ?? "");
      setDescription(cloneDescription(matiere.description));
      setLocalErr(null);
    }, [matiere._id, matiere.designation, matiere.credits, matiere.code, matiere.description]);
  
    const save = async () => {
      const des = designation.trim();
      const cd = code.trim();
      const c = Number.parseFloat(credits.replace(",", "."));
      if (!des) {
        setLocalErr("Désignation requise.");
        return;
      }
      if (!Number.isFinite(c) || c < 0) {
        setLocalErr("Crédits invalides.");
        return;
      }
      if (creditsMatiereDepasseUnite(creditsPlafondUnite, creditsAutresMatieres + c)) {
        setLocalErr(
          `Total matières (${creditsAutresMatieres + c} cr.) dépasse le plafond de l’unité (${creditsPlafondUnite} cr.).`
        );
        return;
      }
      const descParsed = parseDescriptionForSave(description);
      if (!descParsed.ok) {
        setLocalErr(descParsed.message);
        return;
      }
      setSaving(true);
      setLocalErr(null);
      try {
        const res = await fetch(`/api/unites/${uniteId}/matieres/${matiere._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            designation: des,
            credits: c,
            code: cd || undefined,
            description: descParsed.value,
          }),
        });
        const j = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(j.message || "Mise à jour impossible");
        await onAfterChange();
      } catch (e) {
        setLocalErr((e as Error).message);
      } finally {
        setSaving(false);
      }
    };
  
    const del = async () => {
      if (!window.confirm(`Supprimer le cours « ${matiere.designation} » ?`)) return;
      setDeleting(true);
      setLocalErr(null);
      try {
        const res = await fetch(`/api/unites/${uniteId}/matieres/${matiere._id}`, { method: "DELETE" });
        const j = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(j.message || "Suppression impossible");
        await onAfterChange();
      } catch (e) {
        setLocalErr((e as Error).message);
      } finally {
        setDeleting(false);
      }
    };
  
    return (
      <li className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        {localErr ? (
          <p className="mb-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {localErr}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">
            Désignation
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
            Crédits
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
            Code (optionnel)
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <DescriptionBlocsEditor
            label="Description du cours"
            hint="Blocs optionnels (titre + texte). Laissez vide si sans description."
            items={description}
            onChange={setDescription}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => void save()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white dark:bg-primary dark:text-gray-900"
          >
            {saving ? "…" : "Enregistrer ce cours"}
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => void del()}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700 dark:border-red-900/40 dark:text-red-300"
          >
            {deleting ? "…" : "Supprimer"}
          </button>
        </div>
      </li>
    );
  }
  