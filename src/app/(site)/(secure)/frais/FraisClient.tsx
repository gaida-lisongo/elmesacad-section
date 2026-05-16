// 'use client';

// import { useCallback, useEffect, useMemo, useState } from "react";
// import PageManager from "@/components/secure/PageManager";
// import { Frais } from "@/lib/models/Frais";
// import CarteItemFrais from "@/components/Frais/CarteItemFrais";
// import { Icon } from "@iconify/react";

// type FraisClientProps = {
//     tabs: { label: string; value: string }[];
//     initialData: Frais[];
// };

// type FraisWithId = Frais & { id: string; };

// export default function FraisClient({
//     tabs,
//     initialData
// }: FraisClientProps) {
//     const [activeTab, setActiveTab] = useState(tabs[0].value);
//     const [searchText, setSearchText] = useState("");
//     const [items, setItems] = useState<FraisWithId[]>(initialData.map(item => ({ ...item, id: item._id.toString() })));
//     const [currentPage, setCurrentPage] = useState(1);
//     const [totalItems, setTotalItems] = useState(0);
//     const [isLoading, setIsLoading] = useState(false);
//     const [showModal, setShowModal] = useState(false);
//     const [editingFrais, setEditingFrais] = useState<FraisWithId | null>(null);
//     const [formData, setFormData] = useState({
//         annee: "",
//         programmes: "",
//         designation: "",
//         montant: ""
//     });

//     // Pagination
//     const itemsPerPage = 12;
//     const totalPages = Math.ceil(totalItems / itemsPerPage);

//     // Fetch frais with pagination and search
//     const fetchFrais = useCallback(async (page: number, search: string) => {
//         setIsLoading(true);
//         try {
//             const params = new URLSearchParams({
//                 offset: ((page - 1) * itemsPerPage).toString(),
//                 limit: itemsPerPage.toString(),
//                 search,
//                 annee: activeTab
//             });
            
//             const response = await fetch(`/api/frais?${params}`);
//             if (response.ok) {
//                 const result = await response.json();
//                 const fraisWithId = result.data.map((item: any) => ({
//                     ...item,
//                     id: item._id.toString()
//                 }));
//                 setItems(fraisWithId);
//                 // Si le backend ne retourne pas le total, on utilise la longueur des données
//                 setTotalItems(result.data.length);
//             } else {
//                 throw new Error("Erreur lors de la récupération des frais");
//             }
//         } catch (error) {
//             console.error("Erreur:", error);
//             setItems([]);
//         } finally {
//             setIsLoading(false);
//         }
//     }, [activeTab, itemsPerPage]);

//     // Initial fetch
//     useEffect(() => {
//         fetchFrais(currentPage, searchText);
//     }, [fetchFrais, currentPage, searchText]);

//     // Handle search
//     const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchText(e.target.value);
//         setCurrentPage(1);
//     };

//     // Handle page change
//     const handlePageChange = (page: number) => {
//         setCurrentPage(page);
//     };

//     // Handle tab change
//     const handleTabChange = (tabValue: string) => {
//         setActiveTab(tabValue);
//         setCurrentPage(1);
//     };

//     // Handle form input changes
//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({
//             ...prev,
//             [name]: value
//         }));
//     };

//     // Handle form submission
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsLoading(true);
        
//         try {
//             // Validation des données
//             if (!formData.designation.trim() || !formData.montant || !formData.programmes.trim()) {
//                 alert("Veuillez remplir tous les champs obligatoires");
//                 setIsLoading(false);
//                 return;
//             }

//             const body = {
//                 annee: activeTab,
//                 programmes: formData.programmes.split(",").map(p => p.trim()).filter(p => p),
//                 designation: formData.designation.trim(),
//                 montant: parseFloat(formData.montant)
//             };

//             const response = editingFrais 
//                 ? await fetch(`/api/frais`, {
//                     method: 'PUT',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({ ...body, id: editingFrais._id })
//                 })
//                 : await fetch(`/api/frais`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify(body)
//                 });

//             if (response.ok) {
//                 setShowModal(false);
//                 setEditingFrais(null);
//                 setFormData({
//                     annee: activeTab,
//                     programmes: "",
//                     designation: "",
//                     montant: ""
//                 });
//                 fetchFrais(currentPage, searchText);
//             } else {
//                 const errorData = await response.json();
//                 alert(`Erreur: ${errorData.message || "Erreur lors de la sauvegarde"}`);
//             }
//         } catch (error) {
//             alert("Erreur lors de la sauvegarde");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     // Handle edit
//     const handleEdit = (frais: FraisWithId) => {
//         setEditingFrais(frais);
//         setFormData({
//             annee: activeTab,
//             programmes: Array.isArray(frais.programmes) 
//                 ? frais.programmes.map(p => typeof p === 'object' ? (p as any)._id || p : p).join(", ") 
//                 : "",
//             designation: frais.designation || "",
//             montant: frais.montant?.toString() || ""
//         });
//         setShowModal(true);
//     };

//     // Handle delete
//     const handleDelete = (id: string) => {
//         setItems(prev => prev.filter(item => item._id.toString() !== id));
//         setTotalItems(prev => prev - 1);
//     };

//     // Handle modal close
//     const handleCloseModal = () => {
//         setShowModal(false);
//         setEditingFrais(null);
//         setFormData({
//             annee: "",
//             programmes: "",
//             designation: "",
//             montant: ""
//         });
//     };

//     // Render pagination controls
//     const renderPagination = () => {
//         if (totalPages <= 1) return null;

//         const pages = [];
//         const maxVisiblePages = 5;
//         let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
//         let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

//         if (endPage - startPage + 1 < maxVisiblePages) {
//             startPage = Math.max(1, endPage - maxVisiblePages + 1);
//         }

//         for (let i = startPage; i <= endPage; i++) {
//             pages.push(
//                 <button
//                     key={i}
//                     onClick={() => handlePageChange(i)}
//                     className={`px-3 py-1 rounded-md ${
//                         currentPage === i
//                             ? "bg-blue-600 text-white"
//                             : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                     }`}
//                 >
//                     {i}
//                 </button>
//             );
//         }

//         return (
//             <div className="flex justify-center items-center space-x-2 mt-6">
//                 <button
//                     onClick={() => handlePageChange(currentPage - 1)}
//                     disabled={currentPage === 1}
//                     className={`px-3 py-1 rounded-md ${
//                         currentPage === 1
//                             ? "bg-gray-200 text-gray-500 cursor-not-allowed"
//                             : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                     }`}
//                 >
//                     Précédent
//                 </button>
//                 {pages}
//                 <button
//                     onClick={() => handlePageChange(currentPage + 1)}
//                     disabled={currentPage === totalPages}
//                     className={`px-3 py-1 rounded-md ${
//                         currentPage === totalPages
//                             ? "bg-gray-200 text-gray-500 cursor-not-allowed"
//                             : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                     }`}
//                 >
//                     Suivant
//                 </button>
//             </div>
//         );
//     };

//     // Création d'un composant CardItem pour le PageManager
//     const FraisCardItem = ({ item }: { item: FraisWithId }) => (
//         <CarteItemFrais
//             frais={item}
//             onEdit={handleEdit}
//             onDelete={handleDelete}
//         />
//     );

//     // Création d'un composant CardCreate pour le PageManager
//     const FraisCardCreate = () => (
//         <div className="mt-6">
//             {/* Search Bar */}
//             <div className="relative mb-6">
//                 <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
//                     <Icon icon="mdi:search" width="20" height="20" className="text-gray-400" />
//                 </div>
//                 <input
//                     type="text"
//                     value={searchText}
//                     onChange={handleSearch}
//                     placeholder="Rechercher des frais..."
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>

//             {/* Items Grid */}
//             {isLoading ? (
//                 <div className="flex justify-center items-center h-64">
//                     <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//                 </div>
//             ) : items.length === 0 ? (
//                 <div className="text-center py-12">
//                     <p className="text-gray-500">Aucun frais trouvé</p>
//                 </div>
//             ) : (
//                 <>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                         {items.map((frais) => (
//                             <CarteItemFrais
//                                 key={frais.id}
//                                 frais={frais}
//                                 onEdit={handleEdit}
//                                 onDelete={handleDelete}
//                             />
//                         ))}
//                     </div>
//                     {renderPagination()}
//                 </>
//             )}
//         </div>
//     );

//     const PageManagerContent = () => (
//         <div className="w-full">
//             <PageManager
//                 tabs={tabs}
//                 activeTab={activeTab}
//                 onTabChange={handleTabChange}
//                 title="Gestion des Frais"
//                 description="Gérez les frais académiques et leurs modalités"
//                 items={items.map(item => ({ ...item, id: item._id.toString() }))}
//                 CardItem={FraisCardItem}
//                 CardCreate={FraisCardCreate}
//                 showCreateButton={false}
//                 listLayout="grid-4"
//             />
//         </div>
//     );


//     return (
//         <>
//             <PageManagerContent />
//             {/* Modal for Create/Edit */}
//             {showModal && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//                     <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//                         <div className="p-6">
//                             <h2 className="text-xl font-bold mb-4">
//                                 {editingFrais ? "Modifier un frais" : "Ajouter un frais"}
//                             </h2>
//                             <form onSubmit={handleSubmit}>
//                                 <div className="space-y-4">
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                                             Année académique
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="annee"
//                                             value={formData.annee}
//                                             onChange={handleInputChange}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                             required
//                                             disabled={!!editingFrais}
//                                         />
//                                     </div>
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                                             Désignation
//                                         </label>
//                                         <input
//                                             type="text"
//                                             name="designation"
//                                             value={formData.designation}
//                                             onChange={handleInputChange}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                             required
//                                         />
//                                     </div>
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                                             Montant (FCFA)
//                                         </label>
//                                         <input
//                                             type="number"
//                                             name="montant"
//                                             value={formData.montant}
//                                             onChange={handleInputChange}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                             required
//                                             min="0"
//                                         />
//                                     </div>
//                                     <div>
//                                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                                             Programmes (séparés par des virgules)
//                                         </label>
//                                         <textarea
//                                             name="programmes"
//                                             value={formData.programmes}
//                                             onChange={handleInputChange}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                             placeholder="Ex: Licence Informatique, Master Mathématiques"
//                                             required
//                                         />
//                                     </div>
//                                 </div>
//                                 <div className="mt-6 flex justify-end space-x-3">
//                                     <button
//                                         type="button"
//                                         onClick={handleCloseModal}
//                                         className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
//                                     >
//                                         Annuler
//                                     </button>
//                                     <button
//                                         type="submit"
//                                         disabled={isLoading}
//                                         className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//                                     >
//                                         {isLoading ? "Enregistrement..." : "Enregistrer"}
//                                     </button>
//                                 </div>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// }
'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import { Frais } from "@/lib/models/Frais";
import CarteItemFrais from "@/components/Frais/CarteItemFrais";
import CarteCreateFrais from "@/components/Frais/CarteCreateFrais";
import { Icon } from "@iconify/react";

type FraisTab = { label: string; value: string; id: string };

type FraisClientProps = {
    tabs: FraisTab[];
    initialData: Frais[];
};

export type FraisWithId = Frais & { id: string; };

export default function FraisClient({ tabs, initialData }: FraisClientProps) {
    const [activeTab, setActiveTab] = useState(tabs[0].value);
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [items, setItems] = useState<FraisWithId[]>(() => 
        initialData.map(item => ({ ...item, id: item._id.toString() }))
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingFrais, setEditingFrais] = useState<FraisWithId | null>(null);
    
    // Formulaire contrôlé minimaliste
    const [formData, setFormData] = useState({
        annee: "",
        programmes: "",
        designation: "",
        montant: ""
    });

    const itemsPerPage = 12;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Infos de l'onglet actif (label + ObjectId de l'année)
    const currentTab = useMemo(
        () => tabs.find(t => t.value === activeTab),
        [tabs, activeTab]
    );
    const currentTabLabel = currentTab?.label ?? activeTab;
    const currentAnneeId = currentTab?.id ?? "";

    // Effet pour le debounce de la recherche (300ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchText);
            setCurrentPage(1); // Reset à la première page lors d'une recherche
        }, 300);

        return () => clearTimeout(handler);
    }, [searchText]);

    // Récupération des données
    const fetchFrais = useCallback(async (page: number, search: string, tab: string) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                offset: ((page - 1) * itemsPerPage).toString(),
                limit: itemsPerPage.toString(),
                search,
                annee: tab
            });
            
            const response = await fetch(`/api/frais?${params}`);
            if (!response.ok) throw new Error("Erreur serveur");
            
            const result = await response.json();
            
            const fraisWithId = result.data.map((item: any) => ({
                ...item,
                id: item._id.toString()
            }));
            
            setItems(fraisWithId);
            // On privilégie count du backend, sinon fallback sur le total calculé ou la longueur
            setTotalItems(result.total ?? result.count ?? result.data.length);
        } catch (error) {
            console.error("Erreur lors de la récupération des frais:", error);
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [itemsPerPage]);

    // Fetch synchronisé sur le debounce et les changements de page/tab
    useEffect(() => {
        fetchFrais(currentPage, debouncedSearch, activeTab);
    }, [currentPage, debouncedSearch, activeTab, fetchFrais]);

    // Handlers
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTabChange = (tabValue: string) => {
        setActiveTab(tabValue);
        setCurrentPage(1);
    };

    const handleEdit = (frais: FraisWithId) => {
        setEditingFrais(frais);
        const rawProgrammes = (frais as any).programmes;
        setFormData({
            annee: activeTab,
            programmes: Array.isArray(rawProgrammes)
                ? rawProgrammes.map((p: any) => typeof p === 'object' ? p._id || p : p).join(", ")
                : "",
            designation: frais.designation || "",
            montant: frais.montant?.toString() || ""
        });
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        setTotalItems(prev => Math.max(0, prev - 1));
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingFrais(null);
        setFormData({ annee: "", programmes: "", designation: "", montant: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.designation.trim() || !formData.montant) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        setIsLoading(true);
        try {
            const body: Record<string, unknown> = {
                annee: editingFrais ? formData.annee : activeTab,
                designation: formData.designation.trim(),
                montant: parseFloat(formData.montant)
            };
            if (formData.programmes.trim()) {
                body.programmes = formData.programmes.split(",").map(p => p.trim()).filter(Boolean);
            }

            const response = editingFrais 
                ? await fetch(`/api/frais`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, id: editingFrais.id })
                })
                : await fetch(`/api/frais`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

            if (response.ok) {
                handleCloseModal();
                fetchFrais(currentPage, debouncedSearch, activeTab);
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.message || "Erreur lors de la sauvegarde"}`);
            }
        } catch (error) {
            alert("Erreur réseau lors de la sauvegarde");
        } finally {
            setIsLoading(false);
        }
    };

    // Rendu des contrôles de pagination
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        currentPage === i
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Précédent
                </button>
                {pages}
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Suivant
                </button>
            </div>
        );
    };

    return (
        <div className="w-full">
            <PageManager
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                title="Gestion des Frais"
                description="Gérez les frais académiques et leurs modalités"
                items={items}
                listLayout="grid-4"
                CardItem={({ item }) => (
                    <CarteItemFrais frais={item} onEdit={handleEdit} onDelete={handleDelete} />
                )}
                CardCreate={() => (
                    <CarteCreateFrais
                        currentAnneeLabel={currentTabLabel}
                        currentAnneeSlug={activeTab}
                    />
                )}
                onCreate={async (fd) => {
                    const designation = String(fd.get("designation") ?? "").trim();
                    const montant = String(fd.get("montant") ?? "").trim();
                    const annee = String(fd.get("annee") ?? activeTab);

                    if (!designation || !montant) return;

                    await fetch("/api/frais", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            annee,
                            designation,
                            montant: parseFloat(montant),
                        }),
                    });

                    fetchFrais(currentPage, debouncedSearch, activeTab);
                }}
            />

            {/* Modal unique et correctement positionné dans l'arbre DOM */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">
                                {editingFrais ? "Modifier un frais" : "Ajouter un frais"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Année académique
                                    </label>
                                    <input
                                        type="text"
                                        name="annee"
                                        value={editingFrais ? formData.annee : activeTab}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                                        required
                                        disabled
                                    />
                                </div>
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
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Montant
                                    </label>
                                    <input
                                        type="number"
                                        name="montant"
                                        value={formData.montant}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Programmes (séparés par des virgules) — <span className="text-gray-400 font-normal">optionnel</span>
                                    </label>
                                    <textarea
                                        name="programmes"
                                        value={formData.programmes}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                        placeholder="Ex: Licence Informatique, Master Mathématiques"
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
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoading ? "Enregistrement..." : "Enregistrer"}
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