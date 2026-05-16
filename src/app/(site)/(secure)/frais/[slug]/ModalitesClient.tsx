'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface Modalite {
    _id: string;
    designation: string;
    montant: number;
    slug: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    paiements?: any[];
}

interface FraisData {
    _id: string;
    designation: string;
    montant: number;
    slug: string;
    annee?: { designation?: string };
    modalites?: Modalite[];
}

interface ApiResponse {
    data: FraisData & { modalites: Modalite[] };
    metrics: {
        total_modalites: number;
        amount_modalites: number;
        total_paiements: number;
        amount_paiements: number;
        total_paiements_pending: number;
        total_paiements_paid: number;
        total_paiements_failed: number;
        total_paiements_completed: number;
    };
}

type ModalitesClientProps = {
    frais: FraisData;
};

export default function ModalitesClient({ frais }: ModalitesClientProps) {
    const [modalites, setModalites] = useState<Modalite[]>([]);
    const [metrics, setMetrics] = useState<ApiResponse['metrics'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingModalite, setEditingModalite] = useState<Modalite | null>(null);
    const [formData, setFormData] = useState({
        designation: "",
        montant: "",
        description: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchModalites = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/frais/${frais.slug}`);
            if (response.ok) {
                const result: ApiResponse = await response.json();
                setModalites(result.data.modalites || []);
                setMetrics(result.metrics);
            } else {
                console.error("Erreur lors du chargement des modalités");
            }
        } catch (error) {
            console.error("Erreur réseau:", error);
        } finally {
            setIsLoading(false);
        }
    }, [frais.slug]);

    useEffect(() => {
        fetchModalites();
    }, [fetchModalites]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenCreate = () => {
        setEditingModalite(null);
        setFormData({ designation: "", montant: "", description: "" });
        setShowModal(true);
    };

    const handleOpenEdit = (modalite: Modalite) => {
        setEditingModalite(modalite);
        setFormData({
            designation: modalite.designation,
            montant: modalite.montant.toString(),
            description: modalite.description || ""
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingModalite(null);
        setFormData({ designation: "", montant: "", description: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.designation.trim() || !formData.montant) {
            alert("Veuillez remplir la désignation et le montant");
            return;
        }

        setIsSubmitting(true);
        try {
            const body = {
                designation: formData.designation.trim(),
                montant: parseFloat(formData.montant),
                description: formData.description.trim()
            };

            const url = `/api/frais/${frais.slug}`;
            const method = editingModalite ? "PUT" : "POST";

            // Pour PUT, l'API utilise le slug de la modalité, pas celui du frais
            const putUrl = editingModalite ? `/api/frais/${editingModalite.slug}` : url;

            const response = await fetch(editingModalite ? putUrl : url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                handleCloseModal();
                fetchModalites();
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.message || "Échec de l'opération"}`);
            }
        } catch (error) {
            alert("Erreur réseau lors de la sauvegarde");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (modalite: Modalite) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la modalité "${modalite.designation}" ?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/frais/${modalite.slug}`, {
                method: "DELETE"
            });

            if (response.ok) {
                fetchModalites();
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.message || "Échec de la suppression"}`);
            }
        } catch (error) {
            alert("Erreur réseau lors de la suppression");
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/frais"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
                >
                    <Icon icon="mdi:arrow-left" width="16" height="16" className="mr-1" />
                    Retour aux frais
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{frais.designation}</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Année: {frais.annee?.designation || "Non spécifiée"} | Montant total: {frais.montant.toLocaleString('fr-FR')} $
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Icon icon="mdi:plus" width="16" height="16" className="mr-1" />
                        Ajouter une modalité
                    </button>
                </div>
            </div>

            {/* Metrics */}
            {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 uppercase">Modalités</p>
                        <p className="text-xl font-bold text-gray-800">{metrics.total_modalites}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 uppercase">Montant modalités</p>
                        <p className="text-xl font-bold text-gray-800">{metrics.amount_modalites.toLocaleString('fr-FR')} $</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 uppercase">Paiements</p>
                        <p className="text-xl font-bold text-gray-800">{metrics.total_paiements}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 uppercase">Montant payé</p>
                        <p className="text-xl font-bold text-green-600">{metrics.amount_paiements.toLocaleString('fr-FR')} $</p>
                    </div>
                </div>
            )}

            {/* Modalités List */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : modalites.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Icon icon="mdi:cash-multiple" width="48" height="48" className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Aucune modalité de paiement trouvée</p>
                    <button
                        onClick={handleOpenCreate}
                        className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Créer une modalité
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Désignation</th>
                                    <th className="px-4 py-3 font-medium">Montant</th>
                                    <th className="px-4 py-3 font-medium">Paiements</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {modalites.map((modalite) => (
                                    <tr key={modalite._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {modalite.designation}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {modalite.montant.toLocaleString('fr-FR')} $
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {Array.isArray(modalite.paiements) ? modalite.paiements.length : 0} paiement(s)
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleOpenEdit(modalite)}
                                                    className="text-green-600 hover:text-green-800 transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Icon icon="mdi:pencil" width="16" height="16" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(modalite)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Icon icon="mdi:delete" width="16" height="16" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">
                                {editingModalite ? "Modifier la modalité" : "Ajouter une modalité"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Désignation
                                    </label>
                                    <input
                                        type="text"
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        placeholder="Ex: 1ère tranche"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Montant ($)
                                    </label>
                                    <input
                                        type="number"
                                        name="montant"
                                        value={formData.montant}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        min="0"
                                        placeholder="Ex: 50000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description <span className="text-gray-400 font-normal">— optionnel</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                        placeholder="Description de la modalité..."
                                    />
                                </div>
                                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isSubmitting
                                            ? "Enregistrement..."
                                            : editingModalite
                                                ? "Mettre à jour"
                                                : "Créer"
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
