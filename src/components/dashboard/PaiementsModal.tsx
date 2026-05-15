'use client';

import { ChangeEvent } from "react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

type PaiementType = {
    email: string;
    matricule: string;
};

type Props = {
    onClose: () => void;
    onSave: (paiements: PaiementType[]) => Promise<void>;
};

const PaiementsModal = ({
    onClose,
    onSave,
}: Props) => {

    const handleCsvUpload = async (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file) return;

        const text = await file.text();

        const lines = text.split("\n");

        const parsed = lines
            .slice(1)
            .map((line) => {
                const [email, matricule] = line.split(",");

                return {
                    email: email?.trim(),
                    matricule: matricule?.trim(),
                };
            })
            .filter(
                (x) =>
                    x.email &&
                    x.matricule
            );

        await onSave(parsed);

        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            >
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            Import CSV
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Ajouter des paiements
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                    >
                        <Icon
                            icon="ion:close"
                            width={20}
                        />
                    </button>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-500 dark:bg-brand-500/10">
                        <Icon
                            icon="ion:cloud-upload-outline"
                            width={32}
                        />
                    </div>

                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        Importer le fichier CSV
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                        Format attendu :
                    </p>

                    <div className="mt-3 rounded-xl bg-gray-100 p-3 font-mono text-xs dark:bg-gray-800">
                        email,matricule
                    </div>

                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="mt-5 block w-full text-sm"
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PaiementsModal;