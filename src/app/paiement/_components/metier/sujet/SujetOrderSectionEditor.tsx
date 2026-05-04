"use client";

import { Icon } from "@iconify/react";
import type { OrderSujetSection } from "@/lib/sujet/orderSujetTypes";
import { emptySection } from "@/lib/sujet/orderSujetTypes";

type Props = {
  label: string;
  sections: OrderSujetSection[];
  onChange: (next: OrderSujetSection[]) => void;
  contenuPlaceholder?: string;
};

function linesToContenu(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function contenuToLines(contenu: string[]): string {
  return (contenu ?? []).join("\n");
}

export default function SujetOrderSectionEditor({ label, sections, onChange, contenuPlaceholder }: Props) {
  const list = sections.length > 0 ? sections : [emptySection()];

  const updateAt = (idx: number, patch: Partial<OrderSujetSection>) => {
    const next = list.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const removeAt = (idx: number) => {
    if (list.length <= 1) {
      onChange([emptySection()]);
      return;
    }
    onChange(list.filter((_, i) => i !== idx));
  };

  const addSection = () => {
    onChange([...list, emptySection()]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</p>
        <button
          type="button"
          onClick={addSection}
          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
        >
          <Icon icon="solar:add-circle-bold" className="text-base" aria-hidden />
          Ajouter une section
        </button>
      </div>

      <div className="space-y-4">
        {list.map((sec, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <label className="block flex-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Titre de la section
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => updateAt(idx, { title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Ex. — Cadre théorique"
                />
              </label>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                aria-label="Supprimer la section"
              >
                <Icon icon="solar:trash-bin-minimalistic-bold" className="text-lg" />
              </button>
            </div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Contenu (une ligne = un élément du tableau ; retours à la ligne autorisés)
              <textarea
                value={contenuToLines(sec.contenu)}
                onChange={(e) => {
                  const cont = linesToContenu(e.target.value);
                  updateAt(idx, { contenu: cont.length > 0 ? cont : [""] });
                }}
                rows={5}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs leading-relaxed dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder={contenuPlaceholder ?? "Saisissez le texte…"}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
