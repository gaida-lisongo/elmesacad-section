"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { createLaboratoire, updateLaboratoire } from "@/actions/laboratoireActions";
import { TitleContentBlocksEditor, type TitleContentBlock } from "@/components/TitleContentBlocksEditor";

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

interface LaboratoireFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LaboratoireForm({ initialData, onSuccess, onCancel }: LaboratoireFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descBlocks, setDescBlocks] = useState<TitleContentBlock[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const data = {
      nom: fd.get("nom") as string,
      slug: fd.get("slug") as string,
      // ...
    };

    const res = initialData 
      ? await updateLaboratoire(initialData._id, data)
      : await createLaboratoire(data);

    if (res.success) {
      onSuccess?.();
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-1">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du Laboratoire</label>
          <input name="nom" defaultValue={initialData?.nom} required className={inputClass} placeholder="Ex: Laboratoire de Géotechnique" />
        </div>
        <div className="md:col-span-1">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Slug (URL)</label>
          <input name="slug" defaultValue={initialData?.slug} required className={inputClass} placeholder="ex: labo-geotechnique" />
        </div>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-semibold dark:border-gray-600">
          Annuler
        </button>
        <button type="submit" disabled={loading} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {loading ? "Chargement..." : initialData ? "Mettre à jour" : "Créer le laboratoire"}
        </button>
      </div>
    </form>
  );
}
