'use client';

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

type FraisType = {
    _id: string;
    categories: string[];
    designation: string;
    montant: number;
    paiements: {
        email: string;
        matricule: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
};

type Props = {
    frais: FraisType[];

    onEdit: (item: FraisType) => void;

    onDelete: (id: string) => void;

    onUploadCsv: (item: FraisType) => void;
};

const FraisItems = ({
    frais,
    onEdit,
    onDelete,
    onUploadCsv,
}: Props) => {
    const renderItem = (item: FraisType) => {
        return (<>
            <div className="flex items-start justify-between gap-3">
                {/* LEFT */}
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-500 dark:bg-brand-500/10">
                        <Icon
                            icon="ion:card"
                            width={24}
                        />
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">
                            {item.designation}
                        </h4>

                        <p className="mt-1 text-sm font-medium text-brand-500">
                            {item.montant.toLocaleString()} FC
                        </p>

                        {/* TAGS */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {item.categories.map((cat) => (
                                <span
                                    key={cat}
                                    className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-white/[0.05] dark:text-gray-300"
                                >
                                    {cat}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="text-right">
                    <p className="text-xs text-gray-400">
                        Paiements
                    </p>

                    <h5 className="text-lg font-bold text-gray-800 dark:text-white">
                        {item.paiements.length}
                    </h5>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="mt-4 flex items-center gap-2">
                <button
                    onClick={() => onEdit(item)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                >
                    <Icon
                        icon="ion:create-outline"
                        width={16}
                    />

                    Modifier
                </button>

                <button
                    onClick={() =>
                        onUploadCsv(item)
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                    <Icon
                        icon="ion:cloud-upload-outline"
                        width={16}
                    />

                    CSV
                </button>

                <button
                    onClick={() =>
                        onDelete(item._id)
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600"
                >
                    <Icon
                        icon="ion:trash-outline"
                        width={16}
                    />
                </button>
            </div>
        </>)
    }
    return (
        <div
            className={`space-y-3 pr-1 ${
                frais.length > 5
                    ? "max-h-[500px] overflow-y-auto"
                    : ""
            }`}
        >
            {frais.map((item, index) => (
                <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-2xl border border-gray-200 p-4 transition hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                >
                    {renderItem(item)}
                </motion.div>
            ))}
        </div>
    );
};

export default FraisItems;