'use client';
// import { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Icon } from "@iconify/react";

// // Tes images locales INBTP
// const LABORATOIRES_IMAGES = [
//     "/images/inbtp/jpg/img-96.jpg",
//     "/images/inbtp/jpg/img-108.jpg",
//     "/images/inbtp/jpg/img-109.jpg",
//     "/images/inbtp/jpg/img-110.jpg",
//     "/images/inbtp/jpg/img-116.jpg",
//     "/images/inbtp/jpg/img-117.jpg",
//     "/images/inbtp/jpg/img-118.jpg",
//     "/images/inbtp/jpg/img-119.jpg",
// ];

// const LaboHeader = ({
//     canEdit,
//     labo,
//     onSavePost,
//     posts = [], // Par défaut vide si non fourni
// }: LaboHeaderProps & { onSavePost: (data: any) => Promise<void> }) => {
    
//     // --- ÉTATS POUR LES CAROUSELS ---
//     const [bgIndex, setBgIndex] = useState(0);
//     const [postIndex, setPostIndex] = useState(0);
//     const [isModalOpen, setIsModalOpen] = useState(false);

//     // Si pas de posts fournis, on utilise les Mocks pour l'animation
//     const displayPosts = posts.length > 0 ? posts : MOCK_POSTS;

//     // --- LOGIQUE DE DÉFILEMENT AUTOMATIQUE ---
//     useEffect(() => {
//         // 1. Changement d'image de fond toutes les 8 secondes
//         const bgInterval = setInterval(() => {
//             setBgIndex((prev) => (prev + 1) % LABORATOIRES_IMAGES.length);
//         }, 8000);

//         // 2. Changement de poste toutes les 6 secondes
//         const postInterval = setInterval(() => {
//             setPostIndex((prev) => (prev + 1) % displayPosts.length);
//         }, 6000);

//         // Nettoyage des intervalles
//         return () => {
//             clearInterval(bgInterval);
//             clearInterval(postInterval);
//         };
//     }, [displayPosts.length]);

//     // --- VARIANTES FRAMER MOTION ---
    
//     // Animation de glissement Gauche -> Droite
//     const slideLeftToRight = {
//         initial: { x: '-100%', opacity: 0 },
//         animate: { x: 0, opacity: 1 },
//         exit: { x: '100%', opacity: 0 },
//     };

//     return (
//         <section className="relative h-[85vh] w-full overflow-hidden bg-black font-sans">

//             {/* Modal de création */}
//             <CreatePostModal 
//                 isOpen={isModalOpen} 
//                 onClose={() => setIsModalOpen(false)} 
//                 onSave={onSavePost} 
//             />
//             {/* 1. CAROUSEL D'IMAGES DE FOND (G->D) */}
//             <AnimatePresence initial={false}>
//                 <motion.img
//                     key={LABORATOIRES_IMAGES[bgIndex]} // Clé unique pour forcer le re-render de l'animation
//                     src={LABORATOIRES_IMAGES[bgIndex]}
//                     alt={`Labo Background ${bgIndex}`}
//                     className="absolute inset-0 h-full w-full object-cover"
//                     variants={slideLeftToRight}
//                     initial="initial"
//                     animate="animate"
//                     exit="exit"
//                     transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }} // Transition douce type "Laval"
//                 />
//             </AnimatePresence>

//             {/* 2. OVERLAY FIXE */}
//             <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

//             {/* 3. CONTENU PRINCIPAL */}
//             <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
//                 <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20">
//                     <h1 className="text-3xl font-black md:text-5xl uppercase tracking-tighter leading-tight">
//                         {labo?.nom || "Laboratoire INBTP"}
//                     </h1>
//                     {/* On affiche le bouton seulement pour canEdit (Admin/Directeur) */}
//                     {canEdit && (
//                         <button 
//                             onClick={() => setIsModalOpen(true)}
//                             className="flex items-center gap-2 bg-primary px-4 py-2 hover:bg-white hover:text-black transition-all rounded-none text-xs font-bold uppercase tracking-widest text-white"
//                         >
//                             <Icon icon="ph:plus-bold" />
//                             Créer un Poste
//                         </button>
//                     )}
//                 </div>
//                 {/* BLOC TITRE ET DESCRIPTION (Statique mais animé à l'entrée) */}
//                 <motion.div 
//                     initial={{ y: 50, opacity: 0 }}
//                     animate={{ y: 0, opacity: 1 }}
//                     transition={{ delay: 0.2, duration: 0.8 }}
//                     className="w-full md:w-2/3 lg:w-1/2 p-8 md:p-12 text-white bg-black/80 backdrop-blur-md"
//                 >
//                     <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20">
//                         <h1 className="text-3xl font-black md:text-5xl uppercase tracking-tighter leading-tight">
//                             {labo?.nom || "Laboratoire INBTP"}
//                         </h1>
//                         {canEdit && (
//                             <button className="flex items-center gap-2 border border-white/30 px-3 py-1.5 hover:bg-white hover:text-black transition-all rounded-none text-xs font-bold uppercase tracking-widest">
//                                 <Icon icon="solar:pen-bold" />
//                                 Éditer
//                             </button>
//                         )}
//                     </div>
                    
//                     <p className="mb-10 text-base md:text-lg text-gray-300 leading-relaxed">
//                         {labo?.description || "Découvrez l'excellence de la recherche appliquée. Nos équipes repoussent les limites pour répondre aux enjeux de l'ingénierie moderne."}
//                     </p>
                    
//                     <div className="flex flex-wrap gap-4">
//                         <button className="border-2 border-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded-none">
//                             {canEdit ? "Gérer l'unité" : "Explorer les projets"}
//                         </button>
//                         {!canEdit && (
//                             <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-all">
//                                 <Icon icon="ph:arrow-right-bold" />
//                                 Contactez-nous
//                             </button>
//                         )}
//                     </div>
//                 </motion.div>
//             </div>

//             {/* 4. CAROUSEL DES POSTES (G->D) - Positionné en bas à droite */}
//             <div className="absolute bottom-10 right-10 w-full max-w-sm overflow-hidden z-20">
//                 <AnimatePresence mode="wait">
//                     <motion.div
//                         key={displayPosts[postIndex]._id}
//                         className="bg-white p-6 shadow-2xl border-l-4 border-primary"
//                         variants={slideLeftToRight}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         transition={{ duration: 0.8, ease: "anticipate" }}
//                     >
//                         <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
//                             Poste de Recherche en cours
//                         </span>
//                         <h4 className="mt-2 text-sm font-bold text-black uppercase tracking-tight line-clamp-1">
//                             {displayPosts[postIndex].sujet}
//                         </h4>
//                         <p className="mt-2 text-xs text-gray-600 line-clamp-2 italic leading-relaxed">
//                             "{displayPosts[postIndex].problematique}"
//                         </p>
//                     </motion.div>
//                 </AnimatePresence>
                
//                 {/* Indicateurs de progression (petits points) */}
//                 <div className="flex justify-end gap-1.5 mt-3 pr-1">
//                     {displayPosts.map((_, i) => (
//                         <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === postIndex ? 'w-4 bg-primary' : 'w-1 bg-white/40'}`} />
//                     ))}
//                 </div>
//             </div>

//         </section>
//     );
// };

'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from "@iconify/react";
import CreatePostModal from './LaboCreateModel';

// Tes images locales INBTP
const LABORATOIRES_IMAGES = [
    "/images/inbtp/jpg/img-96.jpg",
    "/images/inbtp/jpg/img-108.jpg",
    "/images/inbtp/jpg/img-110.jpg",
    "/images/inbtp/jpg/img-119.jpg",
];

// MOCK des postes si la liste est vide (pour le test visuel)
const MOCK_POSTS = [
    { _id: '1', sujet: "Optimisation des bétons recyclés", problematique: "Comment intégrer 50% d'agrégats recyclés sans perte de compression ?" },
    { _id: '2', sujet: "Modélisation thermique des bâtiments", problematique: "Impact des matériaux locaux sur l'inertie thermique en climat tropical." },
    { _id: '3', sujet: "Intelligence Artificielle & CND", problematique: "Détection automatique des fissures par drone et vision par ordinateur." },
    { _id: '4', sujet: "Stabilité des pentes & Pluies extrêmes", problematique: "Prédiction des glissements de terrain par capteurs IoT." },
];

type LaboHeaderProps = {
    canEdit: boolean;
    labo: any;
    userFonction: string;
    posts?: {
        _id: string;
        sujet: string;
        problematique: string;
    }[];
};

const LaboHeader = ({
    canEdit,
    labo,
    userFonction,
    posts = [],
    onSavePost,
}: LaboHeaderProps & { onSavePost: (data: any) => Promise<void> }) => {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bgIndex, setBgIndex] = useState(0);
    const [postIndex, setPostIndex] = useState(0);

    const displayPosts = posts.length > 0 ? posts : MOCK_POSTS;

    useEffect(() => {
        const bgInterval = setInterval(() => setBgIndex((p) => (p + 1) % LABORATOIRES_IMAGES.length), 8000);
        const postInterval = setInterval(() => setPostIndex((p) => (p + 1) % displayPosts.length), 6000);
        return () => { clearInterval(bgInterval); clearInterval(postInterval); };
    }, [displayPosts.length]);

    const slideLeftToRight = {
        initial: { x: '-100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
    };

    return (
        <section className="relative h-[85vh] w-full overflow-hidden bg-black font-sans">
            
            {/* 1. MODAL DE CRÉATION */}
            <CreatePostModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={onSavePost} 
            />

            {/* 2. CAROUSEL D'IMAGES DE FOND */}
            <AnimatePresence initial={false}>
                <motion.img
                    key={LABORATOIRES_IMAGES[bgIndex]}
                    src={LABORATOIRES_IMAGES[bgIndex]}
                    className="absolute inset-0 h-full w-full object-cover"
                    variants={slideLeftToRight}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                />
            </AnimatePresence>

            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

            {/* 3. INTERFACE DE CONTRÔLE (Bouton en haut à gauche) */}
            <div className="absolute top-8 left-8 z-50 flex flex-col gap-4">
                {canEdit && (
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsModalOpen(true)}
                        className="group flex items-center gap-3 bg-primary text-white px-6 py-3 shadow-2xl transition-all"
                    >
                        <div className="bg-white/20 p-1 group-hover:rotate-90 transition-transform duration-300">
                            <Icon icon="ph:plus-bold" className="text-xl" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">Administration</span>
                            <span className="text-sm font-bold uppercase tracking-tighter">Nouveau Poste</span>
                        </div>
                    </motion.button>
                )}

                {/* Badge de fonction (Optionnel, sous le bouton) */}
                {canEdit && (
                    <div className="bg-black/60 backdrop-blur-md border-l-4 border-primary px-4 py-2 text-white inline-flex items-center gap-2 self-start">
                         <Icon icon="solar:user-bold" className="text-primary text-xs" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{userFonction || 'Directeur'}</span>
                    </div>
                )}
            </div>

            {/* 4. CONTENU CENTRAL (Titres) */}
            <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
                <motion.div 
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="max-w-2xl text-white pt-20" // Padding top pour éviter le bouton si besoin
                >
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                        {labo?.nom || "Unité de Recherche"}
                    </h1>
                    <p className="text-lg text-gray-300 max-w-xl leading-relaxed mb-8">
                        {labo?.description}
                    </p>
                    <div className="h-1 w-20 bg-primary mb-8" />
                </motion.div>
            </div>

            {/* 5. CAROUSEL DES POSTES (Bas Droite) */}
            <div className="absolute bottom-10 right-10 w-full max-w-sm z-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={displayPosts[postIndex]._id}
                        className="bg-white p-6 shadow-2xl border-l-4 border-primary"
                        variants={slideLeftToRight}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.8 }}
                    >
                        <h4 className="text-sm font-black text-black uppercase tracking-tight">{displayPosts[postIndex].sujet}</h4>
                        <p className="mt-2 text-xs text-gray-500 italic line-clamp-2">"{displayPosts[postIndex].problematique}"</p>
                    </motion.div>
                </AnimatePresence>
            </div>

        </section>
    );
};
export default LaboHeader;
