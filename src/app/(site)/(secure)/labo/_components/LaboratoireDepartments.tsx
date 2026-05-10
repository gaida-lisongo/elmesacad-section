"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { updateLaboratoireDepartments } from "@/actions/laboratoireActions";
import { TitleContentBlocksEditor, type TitleContentBlock } from "@/components/TitleContentBlocksEditor";

export default function LaboratoireDepartments({ laboId, initialDepartments }: { laboId: string; initialDepartments: any[] }) {
  const [departements, setDepartements] = useState(initialDepartments);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentDesignation, setCurrentDesignation] = useState("");
  const [currentBlocks, setCurrentBlocks] = useState<TitleContentBlock[]>([]);

  const startEdit = (index: number | null) => {
    if (index === null) {
      setCurrentDesignation("");
      setCurrentBlocks([]);
    } else {
      const d = departements[index];
      setCurrentDesignation(d.designation);
      setCurrentBlocks(d.description.map((b: any) => ({
        id: Math.random().toString(36).slice(2),
        title: b.title,
        contenu: b.contenu.join("\n")
      })));
    }
    setEditingIndex(index === null ? -1 : index);
  };

  const saveDepartment = async () => {
    setLoading(true);
    const newDept = {
      designation: currentDesignation,
      description: currentBlocks.map(b => ({
        title: b.title,
        contenu: b.contenu.split("\n").filter(line => line.trim())
      })),
      galerie: [] // Optionnel pour cet exemple
    };

    let nextDepts = [...departements];
    if (editingIndex === -1) {
      nextDepts.push(newDept);
    } else if (editingIndex !== null) {
      nextDepts[editingIndex] = newDept;
    }

    const res = await updateLaboratoireDepartments(laboId, nextDepts);
    if (res.success) {
      setDepartements(nextDepts);
      setEditingIndex(null);
    }
    setLoading(false);
  };

  const removeDepartment = async (index: number) => {
    if (confirm("Supprimer ce département ?")) {
      const nextDepts = departements.filter((_, i) => i !== index);
      await updateLaboratoireDepartments(laboId, nextDepts);
      setDepartements(nextDepts);
    }
  };

  if (editingIndex !== null) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h3 className="font-bold text-midnight_text dark:text-white">
            {editingIndex === -1 ? "Nouveau département" : "Modifier le département"}
          </h3>
          <button onClick={() => setEditingIndex(null)} className="text-xs font-bold text-gray-500 hover:underline">
            Annuler
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-400">Désignation</label>
            <input
              value={currentDesignation}
              onChange={(e) => setCurrentDesignation(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900"
              placeholder="Ex: Département de Chimie"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-400">Sections de description</label>
            <TitleContentBlocksEditor
              value={currentBlocks}
              onChange={setCurrentBlocks}
              addLabel="Ajouter une section"
            />
          </div>

          <button
            onClick={saveDepartment}
            disabled={loading || !currentDesignation}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer le département"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white transition-all"
        >
          <Icon icon="solar:add-circle-bold" />
          Ajouter un département
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {departements.map((dept, i) => (
          <div key={i} className="group relative rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-primary/30 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-bold text-primary">{dept.designation}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {dept.description.length} section(s) de description
            </p>
            <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => startEdit(i)}
                className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-primary/10 hover:text-primary dark:bg-gray-800 dark:text-gray-400"
              >
                <Icon icon="solar:pen-bold" className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeDepartment(i)}
                className="rounded-lg bg-gray-100 p-2 text-rose-600 hover:bg-rose-50 dark:bg-gray-800"
              >
                <Icon icon="solar:trash-bin-trash-bold" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {departements.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-12 border-2 border-dashed border-gray-100 rounded-2xl dark:border-gray-800">
          Aucun département configuré. Cliquez sur "Ajouter" pour commencer.
        </p>
      )}
    </div>
  );
}
