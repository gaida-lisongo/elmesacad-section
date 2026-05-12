'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from "@iconify/react";

const CreatePostModal = ({ 
    isOpen, 
    onClose, 
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: any) => Promise<void> 
}) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        sujet: '',
        problematique: '',
        methodology: '',
        montant: 0,
        public: true
    });
    const [loading, setLoading] = useState(false);

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
            setStep(1);
        } catch (error) {
            console.error("Erreur sauvegarde poste", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-darklight w-full max-w-xl rounded-none shadow-2xl overflow-hidden"
                    >
                        {/* Barre de Progression Style Laval */}
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800">
                            <motion.div 
                                className="h-full bg-primary"
                                initial={{ width: "33%" }}
                                animate={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>

                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black uppercase tracking-tighter italic">
                                    Nouveau Poste de Recherche <span className="text-primary">[{step}/3]</span>
                                </h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                    <Icon icon="ph:x-bold" className="text-2xl" />
                                </button>
                            </div>

                            {/* ÉTAPE 1 : Identification */}
                            {step === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Sujet de recherche</label>
                                        <input 
                                            className="w-full bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700 p-3 focus:border-primary outline-none transition-all font-bold"
                                            placeholder="Ex: Analyse des structures hydrauliques..."
                                            value={formData.sujet}
                                            onChange={(e) => setFormData({...formData, sujet: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Problématique</label>
                                        <textarea 
                                            rows={3}
                                            className="w-full bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700 p-3 focus:border-primary outline-none transition-all text-sm"
                                            placeholder="Décrivez le problème scientifique..."
                                            value={formData.problematique}
                                            onChange={(e) => setFormData({...formData, problematique: e.target.value})}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* ÉTAPE 2 : Méthodologie */}
                            {step === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Méthodologie appliquée</label>
                                        <textarea 
                                            rows={6}
                                            className="w-full bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700 p-3 focus:border-primary outline-none transition-all text-sm"
                                            placeholder="Comment allez-vous mener cette recherche ?"
                                            value={formData.methodology}
                                            onChange={(e) => setFormData({...formData, methodology: e.target.value})}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* ÉTAPE 3 : Budget & Visibilité */}
                            {step === 3 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Budget Estimé ($)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700 p-3 focus:border-primary outline-none transition-all font-bold"
                                                value={formData.montant}
                                                onChange={(e) => setFormData({...formData, montant: Number(e.target.value)})}
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <button 
                                                onClick={() => setFormData({...formData, public: !formData.public})}
                                                className={`flex items-center gap-2 px-4 py-3 border-2 transition-all font-bold text-xs uppercase tracking-widest ${formData.public ? 'border-primary text-primary' : 'border-gray-200 text-gray-400'}`}
                                            >
                                                <Icon icon={formData.public ? "ph:eye-bold" : "ph:eye-slash-bold"} />
                                                {formData.public ? "Public" : "Interne"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-slate-900 text-[10px] text-gray-500 uppercase tracking-tight">
                                        En soumettant ce poste, il sera envoyé à la direction du laboratoire pour validation avant publication.
                                    </div>
                                </motion.div>
                            )}

                            {/* ACTIONS */}
                            <div className="mt-12 flex justify-between items-center">
                                {step > 1 ? (
                                    <button onClick={prevStep} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary transition-all">
                                        <Icon icon="ph:arrow-left-bold" /> Retour
                                    </button>
                                ) : <div />}

                                {step < 3 ? (
                                    <button 
                                        onClick={nextStep}
                                        disabled={!formData.sujet}
                                        className="bg-black dark:bg-white text-white dark:text-black px-10 py-3 text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-30"
                                    >
                                        Continuer
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="bg-primary text-white px-10 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                                    >
                                        {loading ? <Icon icon="line-md:loading-twotone-loop" /> : <Icon icon="ph:paper-plane-tilt-bold" />}
                                        Finaliser le Poste
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreatePostModal;