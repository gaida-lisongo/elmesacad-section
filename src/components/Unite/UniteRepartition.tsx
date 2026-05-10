"use client";

// import type { PublicUniteDetail } from "@/actions/publicUnites";

// 1 crédit = 25 heures
// 2/3 Présentiel (CMI, TD, TP)
// 1/3 Travail Personnel de l'Étudiant

// const HOURS_PER_CREDIT = 25;
// const PRESENTIEL_RATIO = 2 / 3;
// const PERSONNEL_RATIO = 1 / 3;

// export default function UniteRepartition({ unite }: { unite: PublicUniteDetail }) {
//   const totalHours = unite.credits * HOURS_PER_CREDIT;
//   const presentielHours = totalHours * PRESENTIEL_RATIO;
//   const personnelHours = totalHours * PERSONNEL_RATIO;

//   return (
//     <div className="bg-white dark:bg-darklight rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
//       <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
//         Répartition des heures
//       </h3>

//       <div className="space-y-4">
//         {/* Total */}
//         <div className="flex items-center justify-between">
//           <span className="text-slate-600 dark:text-slate-300">
//             Total ({unite.credits} crédit{unite.credits > 1 ? "s" : ""}){" "}
//           </span>
//           <span className="text-xl font-bold text-slate-900 dark:text-white">
//             {totalHours}h
//           </span>
//         </div>

//         {/* Barre de répartition */}
//         <div className="space-y-3">
//           <div className="flex items-center gap-4">
//             <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-40">
//               Présentiel
//             </span>
//             <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
//               <div
//                 className="h-full bg-primary rounded-full"
//                 style={{ width: `${PRESENTIEL_RATIO * 100}%` }}
//               />
//             </div>
//             <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-20 text-right">
//               {presentielHours}h
//             </span>
//           </div>
//           <p className="text-xs text-slate-500 dark:text-slate-400 pl-40">
//             CMI, TD, TP
//           </p>

//           <div className="flex items-center gap-4">
//             <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-40">
//               Travail Personnel
//             </span>
//             <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
//               <div
//                 className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
//                 style={{ width: `${PERSONNEL_RATIO * 100}%` }}
//               />
//             </div>
//             <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-20 text-right">
//               {personnelHours}h
//             </span>
//           </div>
//         </div>

//         {/* Légende */}
//         <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
//           <p className="text-xs text-slate-500 dark:text-slate-400">
//             1 crédit = {HOURS_PER_CREDIT} heures dont {Math.round(PRESENTIEL_RATIO * 100)}%
//             Présentiel et {Math.round(PERSONNEL_RATIO * 100)}% Travail Personnel
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

const UniteRepartition = ({ credits }: { credits: number }) => {
  const totalH = credits * 25;
  const presentiel = Math.round((2 / 3) * totalH);
  const personnel = Math.round((1 / 3) * totalH);

  return (
    <div className="bg-white dark:bg-darklight p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Icon icon="ph:chart-pie-slice-bold" className="text-primary" />
        Répartition des heures
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600 dark:text-slate-400">Présentiel (CMI, TP, TD)</span>
          <span className="font-bold">{presentiel}h</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: "66%" }} 
            className="bg-primary h-full" 
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600 dark:text-slate-400">Travail personnel</span>
          <span className="font-bold">{personnel}h</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: "33%" }} 
            className="bg-yellow-500 h-full" 
          />
        </div>
        <p className="text-xs text-center text-slate-400 pt-2 border-t dark:border-slate-800">
          Total pour le semestre : {totalH}h
        </p>
      </div>
    </div>
  );
};

export default UniteRepartition;