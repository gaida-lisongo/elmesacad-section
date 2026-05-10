"use client";

import { motion } from "framer-motion";
// Sous-composants
import UniteHeader from "@/components/Unite/UniteHeader";
import UniteMetrics from "@/components/Unite/UniteMetrics";
import UniteRepartition from "@/components/Unite/UniteRepartition";
import UniteMatieresAccordion from "@/components/Unite/UniteMatieresAccordion";
import UniteContent from "@/components/Unite/UniteContent";


export function extractDescriptionSection(text: string, sectionName: string): string {
    const sections = text.split('\n\n');
    const found = sections.find(s => s.toLowerCase().startsWith(sectionName.toLowerCase()));
    if (!found) return "";
    // Retire le label (ex: "Objectif: ") du début
    return found.substring(found.indexOf(':') + 1).trim();
}
  
export function parseListItems(text: string): string[] {
    return text.split('\n').map(item => item.replace(/^\* /, '').trim()).filter(Boolean);
}

export default function UniteClient({ unite }: { unite: any }) {
  return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          
          {/* COLONNE GAUCHE (Contenu descriptif) */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-darklight rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <UniteHeader 
                designation={unite.designation} 
                code={unite.code}
                description={extractDescriptionSection(unite.description, "Objectif")} 
              />
              <hr className="my-8 border-slate-100 dark:border-slate-800" />
              <UniteContent description={unite.description} />
            </motion.div>
          </div>

          {/* COLONNE DROITE (Infos clés & Répartition) */}
          <div className="lg:col-span-1 space-y-6">
            <UniteMetrics unite={unite} />
            <UniteRepartition credits={unite.credits} />
            <UniteMatieresAccordion matieres={unite.matieres} />
          </div>
          
        </div>
      </main>
  );
}