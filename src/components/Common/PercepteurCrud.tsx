'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import type { AgentListItem } from "@/lib/services/UserManager";
import { createPercepteur, deletePercepteur, findPercepteurs } from '@/actions/percepteurActions';
import { UserDatabaseSearch } from '../secure/UserDatabaseSearch';

export default function PercepteurCrud({ 
    r, 
    onBack 
}: { 
    r: SessionResourceRow, 
    onBack: () => void 
}) {
    const [percepteurs, setPercepteurs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPercepteurs = async () => {
        setLoading(true);
        // On recherche les percepteurs liés à la catégorie et référence de la ressource
        const res = await findPercepteurs({ 
            "ressources.reference": r.id // Ajustez selon votre logique de filtrage
        });
        if (res.success) setPercepteurs(res.data);
        setLoading(false);
    };

    useEffect(() => { loadPercepteurs(); }, [r.id]);

    const handleAddAgent = async (agent: AgentListItem) => {
        const newPercepteur = {
            agent: agent.id,
            ressources: [{
                categorie: "session", // ou dynamique selon r
                reference: r.id,
                produit: "session"
            }],
            commandes: [], // à remplir si nécessaire
        };
        await createPercepteur(newPercepteur);
        loadPercepteurs();
    };

    const handleDelete = async (id: string) => {
        await deletePercepteur(id);
        loadPercepteurs();
    };

    return (
        <div className="space-y-6">
            {/* Header avec bouton retour */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800">
                    <Icon icon="solar:arrow-left-linear" className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold">Gestion des percepteurs : {r.designation}</h2>
            </div>

            {/* Zone d'ajout */}
            <div className="bg-gray-50 p-4 rounded-2xl dark:bg-gray-800/50">
                <label className="block text-sm font-medium mb-2">Ajouter un agent percepteur</label>
                <UserDatabaseSearch
                    kind="agent" 
                    onSelect={handleAddAgent}
                    placeholder="Rechercher un agent..."
                />
            </div>

            {/* Liste des percepteurs */}
            <div className="space-y-3">
                {loading ? <p>Chargement...</p> : percepteurs.map((p: any) => (
                    <div key={p._id} className="flex items-center justify-between p-3 border rounded-xl dark:border-gray-700">
                        <div>
                            <p className="font-semibold">{p.agent.name}</p>
                            <p className="text-xs text-gray-500">{p.agent.email}</p>
                        </div>
                        <button 
                            onClick={() => handleDelete(p._id)}
                            className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg"
                        >
                            <Icon icon="solar:trash-bin-trash-bold-duotone" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}