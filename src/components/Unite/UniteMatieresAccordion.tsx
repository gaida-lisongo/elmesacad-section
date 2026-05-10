"use client";

import { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicMatiereDetail } from "@/actions/publicUnites";

type AccordionItemProps = {
  matiere: PublicMatiereDetail;
  isOpen: boolean;
  onToggle: () => void;
};

function AccordionItem({ matiere, isOpen, onToggle }: AccordionItemProps) {
  // Calcul de la répartition pour la matière spécifique
  const totalH = (Number(matiere.credits) || 0) * 25;
  const presentiel = Math.round((2 / 3) * totalH);
  const tpe = Math.round((1 / 3) * totalH);

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      {/* Header : Plus fin, sans background sauf au survol */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 group transition-all"
      >
        <div className="flex flex-col items-start gap-0.5">
           <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
            {matiere.code}
          </span>
          <span className={`text-sm font-semibold transition-colors ${isOpen ? 'text-primary' : 'text-slate-700 dark:text-slate-200 group-hover:text-primary'}`}>
            {matiere.designation}
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {matiere.credits} CR
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon icon="tabler:chevron-down" className={`h-4 w-4 ${isOpen ? 'text-primary' : 'text-slate-400'}`} />
          </motion.div>
        </div>
      </button>

      {/* Content : Répartition des heures */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-5 pt-1 px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      <Icon icon="ph:users-three-bold" /> Présentiel
                   </div>
                   <p className="text-sm font-bold text-slate-800 dark:text-white">{presentiel}h <span className="text-[10px] font-normal text-slate-400">(CMI, TP, TD)</span></p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      <Icon icon="ph:book-open-bold" /> TPE
                   </div>
                   <p className="text-sm font-bold text-slate-800 dark:text-white">{tpe}h <span className="text-[10px] font-normal text-slate-400">(Travail Personnel)</span></p>
                </div>
              </div>
              
              {matiere.description && matiere.description !== "Aucune description disponible" && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                   {matiere.description}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400 italic">
        Aucune matière associée à cette unité
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-darklight rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-wider">
        <Icon icon="ph:list-dashes-bold" className="text-primary text-lg" />
        Détail des Matières
      </h3>
      <div className="flex flex-col">
        {matieres.map((matiere, index) => (
          <AccordionItem
            key={matiere.id || index}
            matiere={matiere}
            isOpen={openIndices.includes(index)}
            onToggle={() => toggleAccordion(index)}
          />
        ))}
      </div>
    </div>
  );
}