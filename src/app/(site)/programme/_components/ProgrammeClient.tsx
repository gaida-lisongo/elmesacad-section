// "use client";

// import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import AOS from 'aos';
// import 'aos/dist/aos.css';
// import { Icon } from '@iconify/react';
import { IProgramme, ISemestre } from '../[slug]/page';

// // Type pour tes Props de composant
// export interface ProgrammeProps {
//   programme: IProgramme;
// }
// const ProgramDetails = ({ programme }: ProgrammeProps) => {
//   const [activeTab, setActiveTab] = useState('En bref');

//   useEffect(() => {
//     AOS.init({ duration: 800, once: true });
//   }, []);

//   // Extraction sécurisée des données
//   const descBrief = programme.description?.find(d => d.title === 'En bref');
//   const descProfile = programme.description?.find(d => d.title === 'Profile du candidat');
//   const descAdmis = programme.description?.find(d => d.title === 'Adminissibilité');

//   return (
//     <div className="max-w-7xl mx-auto p-4 md:p-8 bg-[#F9FAFB] min-h-screen font-sans text-slate-900">
      
//       {/* Row 1 - Header (70/30) */}
//       <div className="flex flex-col md:flex-row gap-6 mb-12" data-aos="fade-down">
//         <div className="md:w-[70%] bg-white p-8 rounded-sm shadow-sm border-l-[6px] border-[#E30613] flex flex-col justify-center">
//           <span className="text-[#E30613] font-bold tracking-tighter mb-2 uppercase text-sm">
//             {programme.section?.cycle || 'Licence'} • {programme.section?.designation}
//           </span>
//           <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
//             {programme.designation}
//           </h1>
//           <div className="flex items-center gap-2 text-slate-500">
//             <Icon icon="ion:location-outline" className="text-xl" />
//             <span className="font-medium text-sm">Kinshasa, INBTP</span>
//           </div>
//         </div>

//         <div className="md:w-[30%] grid grid-cols-2 gap-4">
//           <motion.div 
//             whileHover={{ y: -5 }}
//             className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center"
//           >
//             <div className="bg-red-50 p-3 rounded-full mb-3">
//                 <Icon icon="ion:school-outline" className="text-[#E30613]" />
//             </div>
//             <span className="text-3xl font-black text-slate-800">{programme.credits}</span>
//             <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Crédits ECTS</span>
//           </motion.div>
          
//           <motion.div 
//             whileHover={{ y: -5 }}
//             className="bg-white p-6 rounded-sm shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center"
//           >
//             <div className="bg-blue-50 p-3 rounded-full mb-3">
//               <Icon icon="ion:time-outline" className="text-[#058AC5]" />
//             </div>
//             <span className="text-3xl font-black text-slate-800">{programme.semestres?.length || 2}</span>
//             <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Semestres</span>
//           </motion.div>
//         </div>
//       </div>

//       {/* Row 2 - Description (70/30) */}
//       <div className="flex flex-col md:flex-row gap-8 mb-12">
//         <div className="md:w-[70%]" data-aos="fade-right">
//           <div className="flex items-center gap-3 mb-6">
//             <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Présentation</h2>
//             <div className="h-[1px] flex-grow bg-slate-200"></div>
//           </div>
//           <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-slate-100">
//             <p className="text-slate-600 leading-[1.8] text-lg whitespace-pre-line">
//               {descBrief?.contenu || "Information non disponible."}
//             </p>
//           </div>
//         </div>

//         <div className="md:w-[30%]" data-aos="fade-left">
//           <div className="flex items-center gap-3 mb-6">
//             <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Structure</h2>
//             <div className="h-[1px] flex-grow bg-slate-200"></div>
//           </div>
//           <div className="space-y-4">
//             {programme.semestres?.map((sem, idx) => (
//               <motion.div 
//                 key={sem._id}
//                 initial={{ opacity: 0, x: 20 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: idx * 0.1 }}
//                 className="group bg-white p-5 rounded-sm border border-slate-100 shadow-sm hover:border-[#E30613] transition-all cursor-default"
//               >
//                 <div className="flex justify-between items-center">
//                   <div>
//                     <h4 className="font-bold text-slate-800 group-hover:text-[#E30613] transition-colors">{sem.designation}</h4>
//                     <p className="text-xs text-slate-400 font-medium uppercase tracking-tighter">{sem.credits} Crédits • Ordre {sem.order}</p>
//                   </div>
//                   <Icon icon="ion:chevron-right" className="text-slate-300 group-hover:text-[#E30613]" />
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Row 3 - Admissibilité (Tabulation) */}
//       <div className="bg-white rounded-sm shadow-md border border-slate-100 overflow-hidden" data-aos="fade-up">
//         <div className="flex bg-slate-50 border-b border-slate-100">
//           {programme.description?.filter(d => d.title !== 'En bref').map((item) => (
//             <button 
//               key={item.title}
//               onClick={() => setActiveTab(item.title)}
//               className={`px-10 py-5 font-black uppercase text-xs tracking-[0.15em] transition-all relative ${
//                 activeTab === item.title 
//                 ? 'bg-white text-[#E30613]' 
//                 : 'text-slate-400 hover:text-slate-600'
//               }`}
//             >
//               {item.title}
//               {activeTab === item.title && (
//                 <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E30613]" />
//               )}
//             </button>
//           ))}
//         </div>
        
//         <div className="p-8 md:p-12">
//           <AnimatePresence mode="wait">
//             <motion.div
//               key={activeTab}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               transition={{ duration: 0.2 }}
//             >
//               <div className="grid md:grid-cols-12 gap-12">
//                 <div className="md:col-span-3">
//                   <div className="flex flex-col gap-4 border-l border-slate-100 pl-6">
//                     <span className="text-[#E30613] font-bold text-xs uppercase tracking-widest">Détails de la section</span>
//                     <p className="text-slate-400 text-sm leading-relaxed">
//                       Consultez les prérequis officiels pour valider votre inscription en {programme.designation}.
//                     </p>
//                   </div>
//                 </div>
//                 <div className="md:col-span-9">
//                   <h3 className="text-2xl font-black text-slate-900 mb-6">{activeTab}</h3>
//                   <div className="prose prose-slate max-w-none">
//                     <div className="text-slate-600 leading-relaxed text-lg whitespace-pre-line bg-slate-50 p-6 rounded-sm border-l-2 border-slate-200">
//                       {programme.description?.find(d => d.title === activeTab)?.contenu}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ProgramDetails;
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Icon } from '@iconify/react';
import Link from 'next/link';

const SemestreItem = ({ sem }: { sem: ISemestre }) => {
    // On garde une trace de quel semestre est ouvert
  const [expandedSemestre, setExpandedSemestre] = useState<string | null>(null);

  const toggleSemestre = (id: string) => {
    if (expandedSemestre === id) {
        setExpandedSemestre(null);
    } else {
        setExpandedSemestre(id);
    }
  };

  return (
    <div className="border border-slate-200 rounded-sm bg-white overflow-hidden shadow-sm">
        <button
        onClick={() => toggleSemestre(sem._id?.toString() || '')}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
        >
        <div>
            <h4 className="font-bold text-slate-800">{sem.designation}</h4>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">
            {sem.credits} Crédits • {sem.unites?.length || 0} UE
            </p>
        </div>
        <motion.div
            animate={{ rotate: expandedSemestre === sem._id ? 180 : 0 }}
        >
            <Icon icon="ion:chevron-down" className="text-slate-400" />
        </motion.div>
        </button>

        <AnimatePresence>
        {expandedSemestre === sem._id && (
            <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 bg-slate-50"
            >
            <div className="p-4 space-y-2">
                {sem.unites && sem.unites.length > 0 ? (
                sem.unites.map((unite) => (
                    <Link 
                    key={unite._id?.toString() || ''}
                    href={`/unite/${unite._id?.toString()}`}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-sm hover:border-red-500 hover:shadow-sm transition-all group"
                    >
                    <span className="text-sm font-medium text-slate-700 group-hover:text-red-600 transition-colors">
                        {unite.designation}
                    </span>
                    <Icon icon="ion:arrow-forward-circle-outline" className="text-slate-300 group-hover:text-red-500" />
                    </Link>
                ))
                ) : (
                <p className="text-xs text-slate-400 italic p-2 text-center">
                    Aucune unité d'enseignement répertoriée.
                </p>
                )}
            </div>
            </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
}

const ProgramDetails = ({ programme }: { programme: IProgramme }) => {
  const [activeTab, setActiveTab] = useState('En bref');

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  // Calcul de la métrique Durée (Volume Horaire)
  const volumeHoraire = programme.credits * 25;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-[#F9FAFB] min-h-screen font-sans text-slate-900">
      
      {/* Row 1 - Header & Métriques (70/30) */}
      <div className="flex flex-col md:flex-row gap-6 mb-6" data-aos="fade-down">
        {/* Présentation du programme */}
        <div className="md:w-[70%] bg-white p-8 rounded-sm shadow-sm border-l-[6px] border-[#E30613] flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-red-50 text-[#E30613] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              {programme.section?.cycle}
            </span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              ID: {programme.slug}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight italic">
            {programme.designation}
          </h1>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <Icon icon="ion:school-outline" />
            {programme.section?.designation}
          </p>
        </div>

        {/* Métriques du programme */}
        <div className="md:w-[30%] grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <Icon icon="ion:ribbon-outline" className="text-[#E30613] text-2xl mb-2" />
            <span className="text-2xl font-black text-slate-800">{programme.credits}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Crédits</span>
          </div>
          <div className="bg-white p-5 rounded-sm shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <Icon icon="ion:time-outline" className="text-blue-600 text-2xl mb-2" />
            <span className="text-2xl font-black text-slate-800">{volumeHoraire}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Heures Totales</span>
          </div>
        </div>
      </div>

      {/* NOUVELLE SECTION : À propos de la Section/Faculté */}
      <div className="mb-12" data-aos="fade-up">
        <div className="bg-slate-900 text-white rounded-sm p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl overflow-hidden relative">
          {/* Décoration en arrière-plan */}
          <Icon icon="ion:business-outline" className="absolute -right-10 -bottom-10 text-white/5 text-9xl rotate-12" />
          
          <div className="flex-shrink-0">
            <img 
              src={programme.section?.logo} 
              alt={programme.section?.designation}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/10 shadow-lg"
            />
          </div>
          
          <div className="flex-grow">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-red-500 mb-2">Attachement Académique</h2>
            <h3 className="text-2xl font-bold mb-3">{programme.section?.designation}</h3>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <span className="flex items-center gap-1">
                <Icon icon="ion:mail-outline" className="text-red-500" /> {programme.section?.email}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="ion:call-outline" className="text-red-500" /> {programme.section?.telephone}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="ion:school-outline" className="text-red-500" /> {programme.section?.programmes?.length} programmes
              </span>
            </div>
          </div>
          
          <div className="flex-shrink-0">
             <Link href={`/etudes/${programme.section?.slug}`} className="bg-white text-slate-900 px-6 py-2.5 rounded-sm font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-md">
               Voir la faculté
             </Link>
          </div>
        </div>
      </div>

      {/* Row 2 - Description & Structure (70/30) */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Description du programme */}
        <div className="md:w-[70%]" data-aos="fade-right">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Description du programme</h2>
            <div className="h-[1px] flex-grow bg-slate-200"></div>
          </div>
          <div className="bg-white p-8 md:p-10 rounded-sm shadow-sm border border-slate-100">
            <p className="text-slate-600 leading-[1.8] text-lg whitespace-pre-line">
              {programme.description?.find(d => d.title === 'En bref')?.contenu}
            </p>
          </div>
        </div>

        {/* Structure du programme */}
        <div className="md:w-[30%]" data-aos="fade-left">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Semestres</h2>
            <div className="h-[1px] flex-grow bg-slate-200"></div>
          </div>
          <div className="space-y-4">
            {programme.semestres?.map((sem: ISemestre) => (
              <SemestreItem key={sem._id?.toString() || ''} sem={sem} />
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 - Admissibilité (Tabulation) */}
       <div className="bg-white rounded-sm shadow-md border border-slate-100 overflow-hidden" data-aos="fade-up">
         <div className="flex bg-slate-50 border-b border-slate-100">
           {programme.description?.filter(d => d.title !== 'En bref').map((item) => (
            <button 
              key={item.title}
              onClick={() => setActiveTab(item.title)}
              className={`px-10 py-5 font-black uppercase text-xs tracking-[0.15em] transition-all relative ${
                activeTab === item.title 
                ? 'bg-white text-[#E30613]' 
                : 'text-slate-400 hover:text-slate-600' 
              }`}
            >
              {item.title}
              {activeTab === item.title && (
                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#E30613]" />
              )}
            </button>
          ))}
        </div>
        
        <div className="p-8 md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid md:grid-cols-12 gap-12">
                <div className="md:col-span-3">
                  <div className="flex flex-col gap-4 border-l border-slate-100 pl-6">
                    <span className="text-[#E30613] font-bold text-xs uppercase tracking-widest">Détails de la section</span>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Consultez les prérequis officiels pour valider votre inscription en {programme.designation}.
                    </p>
                  </div>
                </div>
                <div className="md:col-span-9">
                  <h3 className="text-2xl font-black text-slate-900 mb-6">{activeTab}</h3>
                  <div className="prose prose-slate max-w-none">
                    <div className="text-slate-600 leading-relaxed text-lg whitespace-pre-line bg-slate-50 p-6 rounded-sm border-l-2 border-slate-200">
                      {programme.description?.find(d => d.title === activeTab)?.contenu}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};

export default ProgramDetails;