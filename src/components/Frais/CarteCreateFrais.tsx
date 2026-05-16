'use client';

import { Icon } from "@iconify/react";

const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

type CarteCreateFraisProps = {
    currentAnneeLabel: string;
    currentAnneeId: string;
};

export default function CarteCreateFrais({ currentAnneeLabel, currentAnneeId }: CarteCreateFraisProps) {
    return (
        <div className="rounded-2xl bg-gradient-to-br from-gray-50/95 to-white p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] ring-1 ring-gray-200/90 dark:from-gray-900 dark:to-gray-900 dark:ring-gray-700">
            <div className="grid gap-3 rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-gray-900/40 md:grid-cols-2">
                {/* Année académique (affichée, non modifiable) */}
                <div className="md:col-span-2">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <Icon icon="solar:calendar-bold-duotone" className="h-4 w-4 text-primary" />
                        Année académique
                    </label>
                    <div className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <Icon icon="solar:calendar-mark-bold-duotone" className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-midnight_text dark:text-white">{currentAnneeLabel}</span>
                    </div>
                    {/* Hidden input pour envoyer l'ObjectId de l'année dans le FormData */}
                    <input type="hidden" name="annee" value={currentAnneeId} />
                </div>

                {/* Désignation */}
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <Icon icon="solar:text-bold-duotone" className="h-4 w-4 text-primary" />
                        Désignation
                    </label>
                    <input
                        name="designation"
                        placeholder="Ex: Frais d'inscription"
                        required
                        className={inputClass}
                    />
                </div>

                {/* Montant */}
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <Icon icon="solar:wallet-money-bold-duotone" className="h-4 w-4 text-primary" />
                        Montant ($)
                    </label>
                    <input
                        name="montant"
                        type="number"
                        min="0"
                        placeholder="Ex: 50000"
                        required
                        className={inputClass}
                    />
                </div>

                {/* Bouton de soumission */}
                <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition duration-300 hover:scale-[1.01] hover:shadow-xl md:col-span-2"
                >
                    <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
                    Créer le frais
                </button>
            </div>
        </div>
    );
}
