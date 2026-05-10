"use client";

// import type { PublicUniteDetail } from "@/actions/publicUnites";

// const categorieColors = {
//   Obligatoire: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
//   Facultatif: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
//   Optionnel: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
// };

// const cycleColors = {
//   Licence: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
//   Master: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
//   Doctorat: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
// };

// export default function UniteMetrics({ unite }: { unite: PublicUniteDetail }) {
//   return (
//     <div className="bg-white dark:bg-darklight rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
//       <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
//         Informations générales
//       </h3>
//       <div className="space-y-4">
//         {/* Crédits */}
//         <div className="flex items-center justify-between">
//           <span className="text-slate-600 dark:text-slate-300">Crédits</span>
//           <span className="text-xl font-bold text-slate-900 dark:text-white">
//             {unite.credits}
//           </span>
//         </div>

//         {/* Semestre */}
//         <div className="flex items-center justify-between">
//           <span className="text-slate-600 dark:text-slate-300">Semestre</span>
//           <span className="text-sm font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
//             {unite.semestre}
//           </span>
//         </div>

//         {/* Catégorie */}
//         <div className="flex items-center justify-between">
//           <span className="text-slate-600 dark:text-slate-300">Catégorie</span>
//           <span
//             className={`text-sm font-medium px-3 py-1 rounded-lg ${categorieColors[unite.categorie]}`}
//           >
//             {unite.categorie}
//           </span>
//         </div>

//         {/* Cycle */}
//         <div className="flex items-center justify-between">
//           <span className="text-slate-600 dark:text-slate-300">Cycle</span>
//           <span
//             className={`text-sm font-medium px-3 py-1 rounded-lg ${cycleColors[unite.cycle]}`}
//           >
//             {unite.cycle}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

const UniteMetrics = ({ unite }: { unite: any }) => {
  const metrics = [
    { icon: "ph:graduation-cap-bold", label: "Crédits", value: `${unite.credits} cr.` },
    { icon: "ph:timer-bold", label: "Durée totale", value: `${unite.credits * 25} h` },
    { icon: "ph:tag-bold", label: "Catégorie", value: unite.categorie },
    { icon: "ph:stack-bold", label: "Cycle", value: unite.cycle },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((m, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-darklight p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <Icon icon={m.icon} className="text-primary text-2xl mb-2" />
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{m.label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{m.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default UniteMetrics;