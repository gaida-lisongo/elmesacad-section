"use client";

import { Icon } from "@iconify/react";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-[#082b1c]/40 focus:outline-none focus:ring-2 focus:ring-[#082b1c]/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

export type TitleContentBlock = {
  id: string;
  title: string;
  contenu: string;
};

export type TitleContentBlocksEditorProps = {
  value: TitleContentBlock[];
  onChange: (next: TitleContentBlock[]) => void;
  className?: string;
  /** Libellé du bouton d’ajout */
  addLabel?: string;
  /** Texte quand la liste est vide */
  emptyHint?: string;
  titleFieldLabel?: string;
  contentFieldLabel?: string;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  disabled?: boolean;
};

/**
 * Blocs dynamiques titre + contenu (descriptifs, FAQ, etc.).
 * Réutilisable partout où l’utilisateur compose une liste de sections de texte.
 */
export function TitleContentBlocksEditor({
  value,
  onChange,
  className = "",
  addLabel = "Ajouter un bloc",
  emptyHint = "Ajoutez un ou plusieurs blocs pour structurer le texte.",
  titleFieldLabel = "Titre du bloc",
  contentFieldLabel = "Contenu",
  titlePlaceholder = "ex. Présentation, Missions…",
  contentPlaceholder = "Texte…",
  disabled = false,
}: TitleContentBlocksEditorProps) {
  const updateAt = (index: number, patch: Partial<TitleContentBlock>) => {
    const next = value.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addBlock = () => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    onChange([...value, { id, title: "", contenu: "" }]);
  };

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {emptyHint}
        </p>
      )}

      {value.map((block, index) => (
        <div
          key={block.id}
          className="rounded-2xl border border-gray-200/90 bg-white/60 p-4 shadow-sm ring-1 ring-gray-100/80 dark:border-gray-700 dark:bg-gray-900/50 dark:ring-gray-800"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Bloc {index + 1}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(index)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Icon icon="solar:trash-bin-minimalistic-bold" className="h-4 w-4" />
              Retirer
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {titleFieldLabel}
              </label>
              <input
                type="text"
                value={block.title}
                onChange={(e) => updateAt(index, { title: e.target.value })}
                disabled={disabled}
                placeholder={titlePlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {contentFieldLabel}
              </label>
              <textarea
                value={block.contenu}
                onChange={(e) => updateAt(index, { contenu: e.target.value })}
                disabled={disabled}
                rows={4}
                placeholder={contentPlaceholder}
                className={inputClass + " min-h-[100px] resize-y"}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={addBlock}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#082b1c]/25 bg-[#082b1c]/5 py-3 text-sm font-semibold text-[#082b1c] transition hover:border-[#082b1c]/40 hover:bg-[#082b1c]/10 dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
      >
        <Icon icon="solar:add-circle-bold-duotone" className="h-5 w-5" />
        {addLabel}
      </button>
    </div>
  );
}
