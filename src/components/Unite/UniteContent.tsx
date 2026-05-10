'use client';

import { Icon } from "@iconify/react";
import { extractDescriptionSection, parseListItems } from "@/app/unite/[id]/UniteClient";

import { motion } from "framer-motion";


const UniteContent = ({ description }: { description: string }) => {
  const sections = [
    { title: "Préalables", key: "Préalables", icon: "ph:warning-circle-bold" },
    { title: "Compétences visées", key: "Compétences", icon: "ph:target-bold" },
    { title: "Méthode d'enseignement", key: "Méthode d'enseignement", icon: "ph:chalkboard-teacher-bold" },
  ];

  return (
    <div className="space-y-10">
      {sections.map((sec, i) => {
        const rawContent = extractDescriptionSection(description, sec.key);
        const items = parseListItems(rawContent);

        return (
          <div key={i} className="group">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-slate-800 dark:text-white">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon icon={sec.icon} />
              </span>
              {sec.title}
            </h3>
            <ul className="grid grid-cols-1 gap-3">
              {items.map((item, idx) => (
                <motion.li 
                  key={idx}
                  whileHover={{ x: 10 }}
                  className="flex items-start gap-3 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-transparent hover:border-primary/20 transition-all"
                >
                  <Icon icon="ph:check-circle-fill" className="text-primary mt-1 shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default UniteContent;