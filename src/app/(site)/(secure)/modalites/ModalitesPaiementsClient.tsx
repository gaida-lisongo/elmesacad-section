'use client';

import { useState, useCallback, useEffect } from "react";
import PageManager from "@/components/secure/PageManager";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface Paiement {
    id: string;
    _id: string;
    email?: string;
    matricule?: string;
    reference: string;
    status: 'pending' | 'paid' | 'failed' | 'completed';
    createdAt: string;
}

interface Modalite {
    _id: string;
    id: string;
    designation: string;
    montant: number;
    slug: string;
    description?: string;
    frais: {
        _id: string;
        designation: string;
        slug: string;
        annee?: { designation?: string };
    };
    paiements: Paiement[];
}

type TabItem = {
    label: string;
    value: string;
    id: string;
};

type ModalitesPaiementsClientProps = {
    initialTabs: TabItem[];
    initialModalites: Modalite[];
};

const statusLabels: Record<string, string> = {
    pending: "En attente",
    paid: "Payé",
    failed: "Échoué",
    completed: "Terminé",
};

const statusClasses: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
};

export default function ModalitesPaiementsClient({
    initialTabs,
    initialModalites,
}: ModalitesPaiementsClientProps) {
    const [activeTab, setActiveTab] = useState(initialTabs[0]?.value ?? "");
    const [searchText, setSearchText] = useState("");
    const [items, setItems] = useState<Modalite[]>(initialModalites);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPaiement, setEditingPaiement] = useState<Paiement | null>(null);
    const [formData, setFormData] = useState({
        email: "",
        matricule: "",
        reference: "",
        status: "pending" as Paiement['status'],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentModalite = items.find((m) => m.slug === activeTab);

    const fetchPaiements = useCallback(async (modaliteId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/paiements?modalite=${modaliteId}`);
            if (response.ok) {
                const result = await response.json();
                setItems((prev) =>
                    prev.map((m) =>
                        m._id === modaliteId
                            ? { ...m, paiements: result.data ?? [] }
                            : m
                    )
                );
            }
        } catch (error) {
            console.error("Erreur chargement paiements:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentModalite) {
            fetchPaiements(currentModalite._id);
        }
    }, [activeTab, currentModalite, fetchPaiements]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleOpenCreate = () => {
        setEditingPaiement(null);
        setFormData({ email: "", matricule: "", reference: "", status: "pending" });
        setShowModal(true);
    };

    const handleOpenEdit = (paiement: Paiement) => {
        setEditingPaiement(paiement);
        setFormData({
            email: paiement.email || "",
            matricule: paiement.matricule || "",
            reference: paiement.reference,
            status: paiement.status,
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPaiement(null);
        setFormData({ email: "", matricule: "", reference: "", status: "pending" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.reference.trim() || !currentModalite) {
            alert("Référence requise");
            return;
        }

        setIsSubmitting(true);
        try {
            const body = {
                modalite: currentModalite._id,
                email: formData.email.trim().toLowerCase(),
                matricule: formData.matricule.trim(),
                reference: formData.reference.trim(),
                status: formData.status,
            };

            const response = editingPaiement
                ? await fetch("/api/paiements", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: editingPaiement.id, status: formData.status }),
                  })
                : await fetch("/api/paiements", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                  });

            if (response.ok) {
                handleCloseModal();
                fetchPaiements(currentModalite._id);
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.message || "Échec"}`);
            }
        } catch (error) {
            alert("Erreur réseau");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (paiementId: string) => {
        if (!confirm("Supprimer ce paiement ?")) return;
        try {
            const response = await fetch(`/api/paiements?id=${paiementId}`, { method: "DELETE" });
            if (response.ok && currentModalite) {
                fetchPaiements(currentModalite._id);
            }
        } catch (error) {
            alert("Erreur suppression");
        }
    };

    const handleBulkCreate = async (rawText: string, onProgress?: (progress: number) => void) => {
        if (!currentModalite) return;
        const lines = rawText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        const total = lines.length || 1;
        let done = 0;
        const payments: { email: string; matricule: string; reference: string; status: string }[] = [];

        for (const line of lines) {
            const [email, matricule, reference, status] = line.split(",").map((p) => p.trim());
            if (!reference) {
                done += 1;
                onProgress?.(Math.round((done / total) * 100));
                continue;
            }
            payments.push({
                email: email || "",
                matricule: matricule || "",
                reference,
                status: status || "pending",
            });
            done += 1;
            onProgress?.(Math.round((done / total) * 100));
        }

        if (payments.length > 0) {
            const response = await fetch("/api/paiements", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ modalite: currentModalite._id, paiements: payments }),
            });

            if (response.ok) {
                fetchPaiements(currentModalite._id);
            } else {
                const errorData = await response.json();
                alert(`Erreur bulk: ${errorData.message || "Échec"}`);
            }
        }
    };

    const CardItem = ({ item }: { item: Modalite }) => {
        const isActive = item.slug === activeTab;
        return (
            <div
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab(item.slug)}
            >
                <div className="flex items-start justify-between">
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800 truncate">{item.designation}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {item.frais?.designation || "Frais"}
                        </p>
                    </div>
                    <span className="text-xs font-medium text-primary whitespace-nowrap ml-2">
                        {item.montant.toLocaleString("fr-FR")} $
                    </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    {item.paiements?.length ?? 0} paiement(s)
                </p>
            </div>
        );
    };

    const PaiementsContent = () => {
        const paiements = currentModalite?.paiements ?? [];
        const filtered = searchText
            ? paiements.filter(
                  (p) =>
                      (p.email?.toLowerCase() ?? "").includes(searchText.toLowerCase()) ||
                      (p.matricule?.toLowerCase() ?? "").includes(searchText.toLowerCase()) ||
                      p.reference.toLowerCase().includes(searchText.toLowerCase())
              )
            : paiements;

        return (
            <div className="space-y-4">
                {currentModalite && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {currentModalite.designation}
                            </h2>
                            <p className="text-xs text-gray-500">
                                Frais: {currentModalite.frais?.designation} |{" "}
                                <Link href={`/frais/${currentModalite.frais?.slug}`} className="text-primary hover:underline">
                                    Voir les modalités
                                </Link>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenCreate}
                                className="inline-flex items-center px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-darkprimary transition-colors"
                            >
                                <Icon icon="mdi:plus" width="16" height="16" className="mr-1" />
                                Ajouter
                            </button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <Icon icon="mdi:cash-multiple" width="36" height="36" className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500 text-sm">Aucun paiement pour cette modalité</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Référence</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Matricule</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-800">{p.reference}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.email || "—"}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.matricule || "—"}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        statusClasses[p.status] || "bg-gray-100 text-gray-700"
                                                    }`}
                                                >
                                                    {statusLabels[p.status] || p.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(p)}
                                                        className="text-green-600 hover:text-green-800 transition-colors"
                                                        title="Modifier"
                                                    >
                                                        <Icon icon="mdi:pencil" width="16" height="16" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
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

                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-4 text-gray-800">
                                    {editingPaiement ? "Modifier le paiement" : "Ajouter un paiement"}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="exemple@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                                        <input
                                            type="text"
                                            name="matricule"
                                            value={formData.matricule}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="Ex: MAT-2024-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                                        <input
                                            type="text"
                                            name="reference"
                                            value={formData.reference}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                                            required
                                            placeholder="Ex: PAY-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="pending">En attente</option>
                                            <option value="paid">Payé</option>
                                            <option value="failed">Échoué</option>
                                            <option value="completed">Terminé</option>
                                        </select>
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
                                            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-darkprimary disabled:opacity-50 transition-colors"
                                        >
                                            {isSubmitting
                                                ? "Enregistrement..."
                                                : editingPaiement
                                                ? "Mettre à jour"
                                                : "Créer"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageManager
                title="Gestion des paiements"
                description="Consultez et gérez les paiements par modalité"
                tabs={initialTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                items={items}
                listLayout="grid-1"
                searchText={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Rechercher par email, matricule ou référence..."
                bulkCsvHeaders={["email", "matricule", "reference", "status"]}
                onBulkCreate={handleBulkCreate}
                CardItem={CardItem}
                CardCreate={() => null}
                onCreate={() => {}}
            />
            <PaiementsContent />
        </div>
    );
}
