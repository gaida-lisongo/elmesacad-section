"use client";

import { Icon } from "@iconify/react";
import type { DescriptionSectionInput } from "@/actions/organisateurSujetResources";

type Props = {
  value: DescriptionSectionInput[];
  onChange: (next: DescriptionSectionInput[]) => void;
  disabled?: boolean;
};

function ensureBlocks(value: DescriptionSectionInput[]): DescriptionSectionInput[] {
  if (value.length === 0) return [{ title: "", contenu: [""] }];
  return value.map((b) => ({
    title: b.title ?? "",
    contenu: Array.isArray(b.contenu) && b.contenu.length > 0 ? b.contenu.map((l) => String(l ?? "")) : [""],
  }));
}

export function SujetResourceDescriptionEditor({ value, onChange, disabled }: Props) {
  const blocks = ensureBlocks(value);

  const patch = (idx: number, nextBlock: DescriptionSectionInput) => {
    const copy = ensureBlocks(value).slice();
    copy[idx] = nextBlock;
    onChange(copy);
  };

  const addBlock = () => {
    onChange([...ensureBlocks(value), { title: "", contenu: [""] }]);
  };

  const removeBlock = (idx: number) => {
    const copy = ensureBlocks(value).filter((_, i) => i !== idx);
    onChange(copy.length > 0 ? copy : [{ title: "", contenu: [""] }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          <Icon icon="solar:layers-bold-duotone" className="h-4 w-4 text-primary" />
          Sections de description
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={addBlock}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-50 dark:border-primary/40 dark:bg-primary/15 dark:text-sky-100"
        >
          <Icon icon="solar:add-circle-bold-duotone" className="h-4 w-4" />
          Ajouter une section
        </button>
      </div>

      <ol className="space-y-4">
        {blocks.map((block, idx) => (
          <li
            key={idx}
            className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Icon icon="solar:text-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                  Titre de la section
                </span>
                <input
                  disabled={disabled}
                  value={block.title}
                  onChange={(e) => patch(idx, { ...block, title: e.target.value })}
                  placeholder="Ex. Contexte, Objectifs, Méthodologie…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              {blocks.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeBlock(idx)}
                  className="mt-6 shrink-0 rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                  aria-label="Retirer cette section"
                >
                  <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <label className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:notes-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                Contenu
              </span>
              <textarea
                disabled={disabled}
                rows={5}
                value={(block.contenu ?? []).join("\n")}
                onChange={(e) =>
                  patch(idx, {
                    ...block,
                    contenu: e.target.value.split("\n").map((l) => l.trimEnd()),
                  })
                }
                placeholder="Rédigez le texte. Chaque ligne est conservée ; les lignes vides sont ignorées à l’enregistrement."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
