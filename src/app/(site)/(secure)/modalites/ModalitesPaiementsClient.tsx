'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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

// Types pour le bulk
interface BulkItem {
    id: string;
    matricule: string;
    reference: string;
    status: Paiement['status'];
}

export default function ModalitesPaiementsClient({
    initialModalites,
}: ModalitesPaiementsClientProps) {
    const [selectedModalite, setSelectedModalite] = useState<Modalite | null>(null);
    const [searchText, setSearchText] = useState("");
    const [items, setItems] = useState<Modalite[]>(initialModalites);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingPaiement, setEditingPaiement] = useState<Paiement | null>(null);
    const [formData, setFormData] = useState({
        email: "",
        matricule: "",
        reference: "",
        status: "pending" as Paiement['status'],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fetchedRef = useRef<Set<string>>(new Set());

    // États pour le bulk
    const [bulkStep, setBulkStep] = useState<1 | 2 | 3>(1);
    const [csvContent, setCsvContent] = useState("");
    const [separator, setSeparator] = useState(",");
    const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [bulkStatus, setBulkStatus] = useState<Paiement['status']>("pending");
    const [bulkPage, setBulkPage] = useState(1);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const itemsPerPage = 10;

    // Synchroniser selectedModalite avec les items mis à jour
    const currentModalite = useMemo(() => {
        if (!selectedModalite) return null;
        return items.find(m => m._id === selectedModalite._id) || selectedModalite;
    }, [items, selectedModalite]);

    const fetchPaiements = useCallback(async (modaliteId: string) => {
        // Éviter les appels multiples pour la même modalité
        if (fetchedRef.current.has(modaliteId)) return;
        
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
                fetchedRef.current.add(modaliteId);
            }
        } catch (error) {
            console.error("Erreur chargement paiements:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Rafraîchir les paiements (forcer le rechargement)
    const refreshPaiements = useCallback(async (modaliteId: string) => {
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
                fetchedRef.current.add(modaliteId);
            }
        } catch (error) {
            console.error("Erreur chargement paiements:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentModalite && !fetchedRef.current.has(currentModalite._id)) {
            fetchPaiements(currentModalite._id);
        }
    }, [currentModalite?._id, fetchPaiements]);

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
            const body: Record<string, unknown> = {
                modalite: currentModalite._id,
                matricule: formData.matricule.trim(),
                reference: formData.reference.trim(),
                status: formData.status,
            };
            // Email optionnel - ne l'ajouter que s'il est fourni
            if (formData.email.trim()) {
                body.email = formData.email.trim().toLowerCase();
            }

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
                // Rafraîchir immédiatement les paiements pour une UX fluide
                await refreshPaiements(currentModalite._id);
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
                // Rafraîchir immédiatement les paiements pour une UX fluide
                await refreshPaiements(currentModalite._id);
            }
        } catch (error) {
            alert("Erreur suppression");
        }
    };

    // Fonctions pour le bulk
    const handleOpenBulkModal = () => {
        setBulkStep(1);
        setCsvContent("");
        setSeparator(",");
        setDetectedHeaders([]);
        setBulkItems([]);
        setBulkStatus("pending");
        setBulkPage(1);
        setBulkProgress(0);
        setShowBulkModal(true);
    };

    const handleCloseBulkModal = () => {
        setShowBulkModal(false);
        setBulkStep(1);
        setCsvContent("");
        setBulkItems([]);
    };

    const downloadCsvTemplate = () => {
        const csv = "matricule,reference\nMAT-001,REF-001\nMAT-002,REF-002";
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "modele_paiements.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCsvContent(content);
            detectHeaders(content);
        };
        reader.readAsText(file);
    };

    const detectHeaders = (content: string) => {
        const lines = content.split("\n").filter((l) => l.trim());
        if (lines.length === 0) return;

        const firstLine = lines[0];
        // Détecter automatiquement le séparateur
        const separators = [",", ";", "\t", "|"];
        let bestSep = ",";
        let maxCols = 0;

        for (const sep of separators) {
            const cols = firstLine.split(sep).length;
            if (cols > maxCols) {
                maxCols = cols;
                bestSep = sep;
            }
        }

        setSeparator(bestSep);
        const headers = firstLine.split(bestSep).map((h) => h.trim());
        setDetectedHeaders(headers);
    };

    const parseCsvToItems = () => {
        const lines = csvContent.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
            alert("Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données");
            return;
        }

        const dataLines = lines.slice(1); // Skip header
        const parsed: BulkItem[] = [];

        dataLines.forEach((line, index) => {
            const cols = line.split(separator).map((c) => c.trim());
            const matriculeIndex = detectedHeaders.findIndex((h) =>
                h.toLowerCase().includes("matricule")
            );
            const refIndex = detectedHeaders.findIndex((h) =>
                h.toLowerCase().includes("reference") || h.toLowerCase().includes("ref")
            );

            const matricule = matriculeIndex >= 0 ? cols[matriculeIndex] || "" : cols[0] || "";
            const reference = refIndex >= 0 ? cols[refIndex] || "" : cols[1] || "";

            if (reference) {
                parsed.push({
                    id: `temp-${index}`,
                    matricule,
                    reference,
                    status: bulkStatus,
                });
            }
        });

        setBulkItems(parsed);
        setBulkStep(2);
        setBulkPage(1);
    };

    const removeBulkItem = (id: string) => {
        setBulkItems((prev) => prev.filter((item) => item.id !== id));
    };

    const submitBulkPaiements = async () => {
        if (!currentModalite || bulkItems.length === 0) return;

        setIsBulkSubmitting(true);
        setBulkStep(3);

        const total = bulkItems.length;
        const batchSize = 50;
        const batches = Math.ceil(total / batchSize);

        for (let i = 0; i < batches; i++) {
            const batch = bulkItems.slice(i * batchSize, (i + 1) * batchSize);
            const payments = batch.map((item) => ({
                matricule: item.matricule,
                reference: item.reference,
                status: item.status,
            }));

            try {
                const response = await fetch("/api/paiements", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        modalite: currentModalite._id,
                        paiements: payments,
                    }),
                });

                if (!response.ok) {
                    console.error("Erreur batch", i);
                }
            } catch (error) {
                console.error("Erreur réseau batch", i, error);
            }

            const progress = Math.round(((i + 1) / batches) * 100);
            setBulkProgress(progress);
        }

        // Rafraîchir les paiements
        await refreshPaiements(currentModalite._id);
        setIsBulkSubmitting(false);

        // Fermer après un court délai
        setTimeout(() => {
            handleCloseBulkModal();
        }, 1000);
    };

    const totalBulkPages = Math.ceil(bulkItems.length / itemsPerPage);
    const paginatedBulkItems = bulkItems.slice(
        (bulkPage - 1) * itemsPerPage,
        bulkPage * itemsPerPage
    );

    // Filtrer les modalités selon la recherche - useMemo pour forcer la mise à jour
    const filteredModalites = useMemo(() => {
        if (!searchText) return items;
        return items.filter((m) =>
            m.designation.toLowerCase().includes(searchText.toLowerCase()) ||
            m.frais?.designation?.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [items, searchText]);

    // Filtrer les paiements de la modalité sélectionnée
    const filteredPaiements = useMemo(() => {
        if (!currentModalite?.paiements) return [];
        if (!searchText) return currentModalite.paiements;
        return currentModalite.paiements.filter(
            (p) =>
                (p.email?.toLowerCase() ?? "").includes(searchText.toLowerCase()) ||
                (p.matricule?.toLowerCase() ?? "").includes(searchText.toLowerCase()) ||
                p.reference.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [currentModalite?.paiements, searchText]);

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

            {/* Onglets des modalités */}
            <div className="border-b border-gray-200">
                <div className="flex flex-wrap gap-1">
                    {filteredModalites.map((modalite) => {
                        const isSelected = selectedModalite?._id === modalite._id;
                        return (
                            <button
                                key={modalite._id}
                                onClick={() => setSelectedModalite(modalite)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                    isSelected
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="truncate max-w-[150px]">{modalite.designation}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        isSelected ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-500"
                                    }`}>
                                        {modalite.paiements?.length ?? 0}
                                    </span>
                                </div>
                                <div className={`text-xs mt-0.5 text-left ${isSelected ? "text-primary/70" : "text-gray-400"}`}>
                                    {modalite.montant.toLocaleString("fr-FR")} $ • {modalite.frais?.designation || "Frais"}
                                </div>
                            </button>
                        );
                    })}
                </div>
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
                                Ajouter
                            </button>
                            <button
                                onClick={handleOpenBulkModal}
                                className="inline-flex items-center px-4 py-2 bg-white border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
                            >
                                <Icon icon="mdi:file-upload" width="16" height="16" className="mr-2" />
                                Import CSV
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tableau des paiements */}
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
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Référence
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Matricule
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Statut
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredPaiements.map((paiement) => (
                                            <tr
                                                key={paiement.id}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {paiement.reference}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-600">
                                                        {paiement.matricule || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-600">
                                                        {paiement.email || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            statusClasses[paiement.status] || "bg-gray-100 text-gray-700"
                                                        }`}
                                                    >
                                                        {statusLabels[paiement.status] || paiement.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(paiement.createdAt).toLocaleDateString("fr-FR")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
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
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email <span className="text-gray-400">(optionnel)</span>
                                    </label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Référence *</label>
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

            {/* Modal Bulk Import */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header avec étapes */}
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Import en masse de paiements</h2>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bulkStep === 1 ? "bg-primary text-white" : bulkStep > 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        <Icon icon="mdi:upload" width="18" height="18" />
                                        <span className="text-sm font-medium">1. Upload</span>
                                    </div>
                                    <div className="w-8 h-0.5 bg-gray-200" />
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bulkStep === 2 ? "bg-primary text-white" : bulkStep > 2 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        <Icon icon="mdi:table-eye" width="18" height="18" />
                                        <span className="text-sm font-medium">2. Prévisualisation</span>
                                    </div>
                                    <div className="w-8 h-0.5 bg-gray-200" />
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bulkStep === 3 ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                                        <Icon icon="mdi:loading" width="18" height="18" className={bulkStep === 3 ? "animate-spin" : ""} />
                                        <span className="text-sm font-medium">3. Chargement</span>
                                    </div>
                                </div>
                            </div>

                            {/* Étape 1: Upload */}
                            {bulkStep === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Icon icon="mdi:information" width="20" height="20" className="text-blue-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-blue-800 font-medium">Format attendu</p>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    Le fichier CSV doit contenir les colonnes : <code className="bg-blue-100 px-1 rounded">matricule</code> et <code className="bg-blue-100 px-1 rounded">reference</code>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center">
                                        <button
                                            onClick={downloadCsvTemplate}
                                            className="inline-flex items-center px-4 py-2 text-primary hover:bg-primary/5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Icon icon="mdi:download" width="18" height="18" className="mr-2" />
                                            Télécharger le modèle CSV
                                        </button>
                                    </div>

                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                                        <Icon icon="mdi:file-upload-outline" width="48" height="48" className="mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-600 mb-4">Glissez-déposez votre fichier CSV ou cliquez pour parcourir</p>
                                        <input
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleCsvUpload}
                                            className="hidden"
                                            id="csv-upload"
                                        />
                                        <label
                                            htmlFor="csv-upload"
                                            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-darkprimary cursor-pointer transition-colors"
                                        >
                                            <Icon icon="mdi:folder-open" width="18" height="18" className="mr-2" />
                                            Choisir un fichier
                                        </label>
                                    </div>

                                    {csvContent && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-medium text-gray-700">Séparateur détecté:</span>
                                                <select
                                                    value={separator}
                                                    onChange={(e) => {
                                                        setSeparator(e.target.value);
                                                        detectHeaders(csvContent);
                                                    }}
                                                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                                                >
                                                    <option value=",">Virgule (,)</option>
                                                    <option value=";">Point-virgule (;)</option>
                                                    <option value="\t">Tabulation</option>
                                                    <option value="|">Pipe (|)</option>
                                                </select>
                                            </div>
                                            {detectedHeaders.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {detectedHeaders.map((header, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                                                            {header}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                {csvContent.split("\n").filter((l) => l.trim()).length - 1} ligne(s) de données détectée(s)
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={handleCloseBulkModal}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={parseCsvToItems}
                                            disabled={!csvContent || detectedHeaders.length === 0}
                                            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-darkprimary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Continuer
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Étape 2: Prévisualisation */}
                            {bulkStep === 2 && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">{bulkItems.length}</span> paiement(s) à importer
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-gray-600">Status par défaut:</label>
                                            <select
                                                value={bulkStatus}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value as Paiement['status'];
                                                    setBulkStatus(newStatus);
                                                    setBulkItems((prev) =>
                                                        prev.map((item) => ({ ...item, status: newStatus }))
                                                    );
                                                }}
                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                            >
                                                <option value="pending">En attente</option>
                                                <option value="paid">Payé</option>
                                                <option value="failed">Échoué</option>
                                                <option value="completed">Terminé</option>
                                            </select>
                                        </div>
                                    </div>

                                    {bulkItems.length > 0 && (
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {paginatedBulkItems.map((item, idx) => (
                                                        <tr key={item.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-gray-500">
                                                                {(bulkPage - 1) * itemsPerPage + idx + 1}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-gray-800">{item.matricule || "—"}</td>
                                                            <td className="px-4 py-3 text-gray-600">{item.reference}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[item.status]}`}>
                                                                    {statusLabels[item.status]}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    onClick={() => removeBulkItem(item.id)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Supprimer"
                                                                >
                                                                    <Icon icon="mdi:delete" width="16" height="16" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Pagination */}
                                            {totalBulkPages > 1 && (
                                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                                                    <p className="text-sm text-gray-600">
                                                        Page {bulkPage} sur {totalBulkPages}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setBulkPage((p) => Math.max(1, p - 1))}
                                                            disabled={bulkPage === 1}
                                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-colors"
                                                        >
                                                            Précédent
                                                        </button>
                                                        <button
                                                            onClick={() => setBulkPage((p) => Math.min(totalBulkPages, p + 1))}
                                                            disabled={bulkPage === totalBulkPages}
                                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-colors"
                                                        >
                                                            Suivant
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setBulkStep(1)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            onClick={submitBulkPaiements}
                                            disabled={bulkItems.length === 0 || isBulkSubmitting}
                                            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-darkprimary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isBulkSubmitting ? "Traitement..." : `Importer ${bulkItems.length} paiement(s)`}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Étape 3: Chargement */}
                            {bulkStep === 3 && (
                                <div className="py-12 text-center">
                                    <div className="mb-6">
                                        <div className="relative w-32 h-32 mx-auto">
                                            <svg className="w-32 h-32 transform -rotate-90">
                                                <circle
                                                    cx="64"
                                                    cy="64"
                                                    r="56"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    className="text-gray-200"
                                                />
                                                <circle
                                                    cx="64"
                                                    cy="64"
                                                    r="56"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="none"
                                                    strokeDasharray={`${2 * Math.PI * 56}`}
                                                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - bulkProgress / 100)}`}
                                                    className="text-primary transition-all duration-300"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-gray-800">{bulkProgress}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                        Importation en cours...
                                    </h3>
                                    <p className="text-gray-500">
                                        Veuillez patienter pendant le traitement des paiements
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
