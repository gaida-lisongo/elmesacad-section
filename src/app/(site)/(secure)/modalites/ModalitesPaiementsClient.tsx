'use client';

import { useState, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";

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

type ModalitesPaiementsClientProps = {
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
    initialModalites,
}: ModalitesPaiementsClientProps) {
    const [selectedModalite, setSelectedModalite] = useState<Modalite | null>(null);
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
    const [hasFetched, setHasFetched] = useState<Record<string, boolean>>({});

    const currentModalite = selectedModalite;

    const fetchPaiements = useCallback(async (modaliteId: string) => {
        // Éviter les appels multiples pour la même modalité
        if (hasFetched[modaliteId]) return;
        
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
                setHasFetched((prev) => ({ ...prev, [modaliteId]: true }));
            }
        } catch (error) {
            console.error("Erreur chargement paiements:", error);
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched]);

    useEffect(() => {
        if (currentModalite && !hasFetched[currentModalite._id]) {
            fetchPaiements(currentModalite._id);
        }
    }, [currentModalite?._id]);

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
                // Réinitialiser le flag pour permettre le rechargement
                setHasFetched((prev) => ({ ...prev, [currentModalite._id]: false }));
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
                // Réinitialiser le flag pour permettre le rechargement
                setHasFetched((prev) => ({ ...prev, [currentModalite._id]: false }));
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
                // Réinitialiser le flag pour permettre le rechargement
                setHasFetched((prev) => ({ ...prev, [currentModalite._id]: false }));
                fetchPaiements(currentModalite._id);
            } else {
                const errorData = await response.json();
                alert(`Erreur bulk: ${errorData.message || "Échec"}`);
            }
        }
    };

    // Filtrer les modalités selon la recherche
    const filteredModalites = searchText
        ? items.filter((m) =>
              m.designation.toLowerCase().includes(searchText.toLowerCase()) ||
              m.frais?.designation?.toLowerCase().includes(searchText.toLowerCase())
          )
        : items;

    // Filtrer les paiements de la modalité sélectionnée
    const filteredPaiements = currentModalite?.paiements
        ? searchText
            ? currentModalite.paiements.filter(
                  (p) =>
                      (p.email?.toLowerCase() ?? "").includes(searchText.toLowerCase()) ||
                      (p.matricule?.toLowerCase() ?? "").includes(searchText.toLowerCase()) ||
                      p.reference.toLowerCase().includes(searchText.toLowerCase())
              )
            : currentModalite.paiements
        : [];

    return (
        <div className="space-y-6">
            {/* Header avec titre et recherche */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Modalités de paiement</h1>
                    <p className="text-sm text-gray-500">
                        {items.length} modalité(s) disponible(s)
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Icon
                            icon="mdi:magnify"
                            width="18"
                            height="18"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Rechercher..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none w-full sm:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Grille des modalités */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredModalites.map((modalite) => {
                    const isSelected = selectedModalite?._id === modalite._id;
                    return (
                        <div
                            key={modalite._id}
                            onClick={() => setSelectedModalite(modalite)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold text-gray-800 truncate">{modalite.designation}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {modalite.frais?.designation || "Frais"}
                                    </p>
                                </div>
                                <span className="text-xs font-medium text-primary whitespace-nowrap ml-2">
                                    {modalite.montant.toLocaleString("fr-FR")} $
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    {modalite.paiements?.length ?? 0} paiement(s)
                                </span>
                                {isSelected && (
                                    <Icon icon="mdi:check-circle" width="16" height="16" className="text-primary" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Métrique de la modalité sélectionnée */}
            {selectedModalite && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{selectedModalite.designation}</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {selectedModalite.description || "Aucune description"}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>Frais: {selectedModalite.frais?.designation}</span>
                                <span>Montant: {selectedModalite.montant.toLocaleString("fr-FR")} $</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenCreate}
                                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-darkprimary transition-colors"
                            >
                                <Icon icon="mdi:plus" width="16" height="16" className="mr-2" />
                                Ajouter un paiement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grille des paiements (4 par ligne) */}
            {selectedModalite && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Paiements ({filteredPaiements.length})
                    </h3>
                    
                    {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredPaiements.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Icon icon="mdi:cash-multiple" width="48" height="48" className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">Aucun paiement pour cette modalité</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredPaiements.map((paiement) => (
                                <div
                                    key={paiement.id}
                                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{paiement.reference}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{paiement.email || "—"}</p>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                statusClasses[paiement.status] || "bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            {statusLabels[paiement.status] || paiement.status}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="mdi:identifier" width="14" height="14" />
                                            <span>{paiement.matricule || "—"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="mdi:calendar" width="14" height="14" />
                                            <span>
                                                {new Date(paiement.createdAt).toLocaleDateString("fr-FR")}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => handleOpenEdit(paiement)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <Icon icon="mdi:pencil" width="16" height="16" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(paiement.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <Icon icon="mdi:delete" width="16" height="16" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal d'ajout/édition */}
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
}
