"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PublicMatiereDetail } from "@/actions/publicUnites";

type AccordionItemProps = {
  matiere: PublicMatiereDetail;
  isOpen: boolean;
  onToggle: () => void;
};

function AccordionItem({ matiere, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-darklight hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded">
            {matiere.code}
          </span>
          <span className="font-medium text-slate-900 dark:text-white">
            {matiere.designation}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
            {matiere.credits} crédit{matiere.credits > 1 ? "s" : ""}
          </span>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {matiere.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UniteMatieresAccordion({
  matieres,
}: {
  matieres: PublicMatiereDetail[];
}) {
  const [openIndices, setOpenIndices] = useState<number[]>([]);

  const toggleAccordion = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  if (matieres.length === 0) {
    return (
      <div className="bg-white dark:bg-darklight rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm text-center text-slate-500 dark:text-slate-400">
        Aucune matière associée à cette unité
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-darklight rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
        Matières ({matieres.length})
      </h3>
      <div className="space-y-3">
        {matieres.map((matiere, index) => (
          <AccordionItem
            key={matiere.id}
            matiere={matiere}
            isOpen={openIndices.includes(index)}
            onToggle={() => toggleAccordion(index)}
          />
        ))}
      </div>
    </div>
  );
}
