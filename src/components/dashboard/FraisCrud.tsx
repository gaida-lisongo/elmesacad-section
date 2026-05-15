'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import PaiementsModal from "./PaiementsModal";
import FraisItems from "./FraisItems";

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

type FraisPayload = {
    categories: string[];
    designation: string;
    montant: number;
    paiements?: {
        email: string;
        matricule: string;
    }[];
};

const AVAILABLE_CATEGORIES = [
    "VALIDATION",
    "RELEVE",
    "SESSION",
    "LABO",
    "STAGE",
    "SUJET",
];

export default function FraisCrud() {
    const [frais, setFrais] = useState<FraisType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");

    const [openForm, setOpenForm] = useState(false);
    const [editing, setEditing] = useState<FraisType | null>(null);

    const [csvModal, setCsvModal] = useState<FraisType | null>(null);

    const [form, setForm] = useState({
        designation: "",
        montant: "",
        categories: [] as string[],
    });

    const fetchFrais = useCallback(async () => {
        try {
            setLoading(true);

            const req = await fetch(`/api/frais`);
            const res = await req.json();

            if (req.status !== 200) {
                throw new Error(res.message);
            }

            setFrais(res.data);
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createFrais = useCallback(async (payload: FraisPayload) => {
        try {
            const req = await fetch("/api/frais", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const res = await req.json();

            if (req.status !== 201) {
                throw new Error(res.message);
            }

            return res.data;
        } catch (error: any) {
            setError(error.message);
        }
    }, []);

    const updateFrais = useCallback(async (payload: any) => {
        try {
            const req = await fetch(`/api/frais`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const res = await req.json();

            if (req.status !== 200) {
                throw new Error(res.message);
            }

            return res.data;
        } catch (error: any) {
            setError(error.message);
        }
    }, []);

    const deleteFrais = useCallback(async (id: string) => {
        try {
            const req = await fetch(`/api/frais`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id }),
            });

            const res = await req.json();

            if (req.status !== 200) {
                throw new Error(res.message);
            }

            return true;
        } catch (error: any) {
            setError(error.message);
            return false;
        }
    }, []);

    useEffect(() => {
        fetchFrais();
    }, [fetchFrais]);

    const filtered = useMemo(() => {
        return frais.filter((f) =>
            `${f.designation} ${f.categories.join(" ")}`
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [frais, search]);

    const resetForm = () => {
        setForm({
            designation: "",
            montant: "",
            categories: [],
        });

        setEditing(null);
    };

    const toggleCategory = (category: string) => {
        setForm((prev) => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter((c) => c !== category)
                : [...prev.categories, category],
        }));
    };

    const openEdit = (item: FraisType) => {
        setEditing(item);

        setForm({
            designation: item.designation,
            montant: String(item.montant),
            categories: item.categories,
        });

        setOpenForm(true);
    };

    const handleSubmit = async () => {
        const payload: FraisPayload = {
            designation: form.designation,
            montant: Number(form.montant),
            categories: form.categories,
        };

        if (editing) {
            await updateFrais({
                id: editing._id,
                ...payload,
                paiements: editing.paiements,
            });
        } else {
            await createFrais(payload);
        }

        resetForm();
        setOpenForm(false);

        fetchFrais();
    };

    const handleDelete = async (id: string) => {
        const confirmDelete = confirm(
            "Voulez-vous supprimer ce frais ?"
        );

        if (!confirmDelete) return;

        const ok = await deleteFrais(id);

        if (ok) fetchFrais();
    };

    const handleSavePaiements = async (
        paiements: {
            email: string;
            matricule: string;
        }[]
    ) => {
        if (!csvModal) return;
    
        await updateFrais({
            id: csvModal._id,
            designation: csvModal.designation,
            montant: csvModal.montant,
            categories: csvModal.categories,
            paiements: [
                ...csvModal.paiements,
                ...paiements,
            ],
        });
    
        fetchFrais();
    };

    return (
        <>
            {/* CARD */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                {/* HEADER */}
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Frais Académiques
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            Gestion des frais étudiants
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchFrais()}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/[0.05]"
                        >
                            <Icon icon="ion:reload" width={18} />
                        </button>

                        <button
                            onClick={() => {
                                resetForm();
                                setOpenForm(true);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/80"
                        >
                            <Icon icon="ion:add" width={18} />
                            Ajouter
                        </button>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                    <Icon
                        icon="ion:search"
                        width={18}
                        className="text-gray-400"
                    />

                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none"
                    />
                </div>

                {/* CONTENT */}
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                repeat: Infinity,
                                duration: 1,
                                ease: "linear",
                            }}
                        >
                            <Icon
                                icon="ion:reload-circle"
                                width={38}
                                className="text-brand-500"
                            />
                        </motion.div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                        Aucun frais trouvé
                    </div>
                ) : <FraisItems
                    frais={filtered}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onUploadCsv={(item) => setCsvModal(item)}
                />}

                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
                        {error}
                    </div>
                )}
            </div>

            {/* FORM MODAL */}
            <AnimatePresence>
                {openForm && (
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
                            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {editing
                                            ? "Modifier le frais"
                                            : "Nouveau frais"}
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Gestion des catégories et montants
                                    </p>
                                </div>

                                <button
                                    onClick={() => setOpenForm(false)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                >
                                    <Icon
                                        icon="ion:close"
                                        width={22}
                                    />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* DESIGNATION */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Désignation
                                    </label>

                                    <input
                                        type="text"
                                        value={form.designation}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                designation:
                                                    e.target.value,
                                            })
                                        }
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
                                    />
                                </div>

                                {/* MONTANT */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Montant
                                    </label>

                                    <input
                                        type="number"
                                        value={form.montant}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                montant: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
                                    />
                                </div>

                                {/* CATEGORIES */}
                                <div>
                                    <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Catégories
                                    </label>

                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_CATEGORIES.map((cat) => {
                                            const active =
                                                form.categories.includes(
                                                    cat
                                                );

                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() =>
                                                        toggleCategory(cat)
                                                    }
                                                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                        active
                                                            ? "border-brand-500 bg-brand-500 text-primary"
                                                            : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    className="w-full rounded-2xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
                                >
                                    {editing
                                        ? "Mettre à jour"
                                        : "Créer le frais"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CSV MODAL */}
            <AnimatePresence>
            {csvModal && (
                <PaiementsModal
                    onClose={() => setCsvModal(null)}
                    onSave={handleSavePaiements}
                />
            )}
            </AnimatePresence>
        </>
    );
}