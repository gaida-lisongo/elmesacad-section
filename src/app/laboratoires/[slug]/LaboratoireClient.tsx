'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from "@iconify/react";

// --- MOCKS ---
const DEPARTEMENTS = [
    { title: "Génie Civil", desc: "Recherche sur les structures et les matériaux innovants.", img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800" },
    { title: "Thermique & Énergie", desc: "Optimisation des systèmes de refroidissement et thermodynamique.", img: "https://images.unsplash.com/photo-1534224039826-c7a0dee2e671?q=80&w=800" },
    { title: "Informatique Appliquée", desc: "Intelligence artificielle et systèmes embarqués pour l'industrie.", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800" },
];

const LaboratoireClient = () => {
    return (
        <div className="bg-white text-slate-900 font-sans">
            
            {/* 1. SECTION HEADER (Hero Post) */}
            <section className="relative h-[85vh] w-full overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=2000" 
                    className="absolute inset-0 h-full w-full object-cover" 
                    alt="Hero Labo"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
                    <motion.div 
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="max-w-2xl bg-black/80 p-8 md:p-12 text-white backdrop-blur-sm"
                    >
                        <h1 className="mb-6 text-4xl font-black md:text-6xl uppercase tracking-tighter">
                            Au cœur de l'innovation technologique
                        </h1>
                        <p className="mb-8 text-lg text-gray-300">
                            Découvrez l'excellence de la recherche appliquée. Nos laboratoires repoussent les limites du génie pour répondre aux enjeux de demain.
                        </p>
                        <button className="border-2 border-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                            Apprenez-en plus
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* 2. SECTION DEPARTEMENTS (Grid) */}
            <section className="py-20 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black uppercase tracking-tight italic">Recherche, Création et Innovation</h2>
                    <div className="h-1 w-12 bg-red-600 mx-auto mt-4" />
                    <p className="mt-6 text-gray-600 max-w-3xl mx-auto">
                        Un milieu de recherche par excellence, reconnu pour la transdisciplinarité de ses équipes et l'impact de ses découvertes.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {DEPARTEMENTS.map((dept, i) => (
                        <motion.div 
                            key={i} 
                            whileHover={{ y: -10 }}
                            className="bg-white shadow-xl overflow-hidden border border-gray-100"
                        >
                            <img src={dept.img} className="h-56 w-full object-cover" alt={dept.title} />
                            <div className="p-8">
                                <h3 className="text-xl font-black mb-4">{dept.title}</h3>
                                <p className="text-gray-600 text-sm mb-6">{dept.desc}</p>
                                <button className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-1 hover:text-red-600 hover:border-red-600 transition-all">
                                    Découvrez l'unité
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 3. SECTION MANIPULATION (Video/Action) */}
            <section className="bg-black text-white py-0 overflow-hidden flex flex-col md:flex-row items-center">
                <div className="w-full md:w-1/2 p-12 md:p-24">
                    <h2 className="text-4xl font-black mb-6 uppercase leading-tight">La recherche, c'est du sport</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Parce que les idées brillantes émanent des gens, voyez comment leur collaboration au quotidien les amène à repousser les limites des connaissances.
                    </p>
                    <button className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                        <span className="h-10 w-10 rounded-full border border-white flex items-center justify-center">
                            <Icon icon="ph:play-fill" />
                        </span>
                        Voir le laboratoire en action
                    </button>
                </div>
                <div className="w-full md:w-1/2 relative h-[500px]">
                    <img 
                        src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200" 
                        className="h-full w-full object-cover opacity-70" 
                        alt="Manipulation"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon icon="ph:play-circle-light" className="text-8xl text-white/50" />
                    </div>
                </div>
            </section>

            {/* 4. SECTION EQUIPEMENTS (Alternated Blocks) */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row gap-12 items-center bg-white shadow-sm">
                        <div className="w-full md:w-1/2">
                            <img src="https://images.unsplash.com/photo-1579154235602-3c2c2aa59c1c?q=80&w=1200" className="w-full h-full object-cover" alt="Equipement" />
                        </div>
                        <div className="w-full md:w-1/2 p-8 md:p-16">
                            <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Équipements de pointe 2022-2027</h2>
                            <p className="text-gray-600 mb-8">
                                Notre parc matériel s'articule autour d'une ambition claire : mener des travaux de recherche inclusifs, connectés et durables.
                            </p>
                            <button className="border border-black px-10 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                                Consulter l'inventaire
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. SECTION CONTACT (About / Footer CTA) */}
            <section className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/2">
                    <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200" className="h-[400px] w-full object-cover" alt="Team" />
                </div>
                <div className="w-full md:w-1/2 bg-black text-white p-12 md:p-24 flex flex-col justify-center">
                    <h2 className="text-3xl font-black mb-6 uppercase tracking-tight">Direction de la recherche et de l'innovation</h2>
                    <p className="text-gray-400 mb-10 text-sm">
                        Le service veille à l'essor et à la promotion de la recherche technologique à travers nos différents pôles d'expertise.
                    </p>
                    <div className="flex flex-col gap-4 max-w-xs">
                        <button className="border border-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                            Communiquez avec nous
                        </button>
                        <button className="border border-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                            À propos du Labo
                        </button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default LaboratoireClient;