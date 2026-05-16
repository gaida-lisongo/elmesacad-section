'use client';

import { useState } from "react";
import { Frais } from "@/lib/models/Frais";
import { Types } from "mongoose";
import Link from "next/link";
import { Icon } from "@iconify/react";

type CarteItemFraisProps = {
    frais: Frais & { id?: string; _id?: string | Types.ObjectId };
    onEdit: (frais: Frais & { id: string }) => void;
    onDelete: (id: string) => void;
};

export default function CarteItemFrais({ frais, onEdit, onDelete }: CarteItemFraisProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce frais ?")) {
            setIsDeleting(true);
            try {
                const response = await fetch(`/api/frais?id=${frais._id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    onDelete(frais?._id?.toString());
                } else {
                    const error = await response.json();
                    alert(`Erreur: ${error.message}`);
                }
            } catch (error) {
                alert("Erreur lors de la suppression");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300">
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{frais.designation}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {frais.annee && typeof frais.annee === 'object' ? (frais.annee as any).designation : 'Année inconnue'}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <Link 
                            href={`/frais/${frais.slug}`} 
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Voir les détails"
                        >
                            <Icon icon="mdi:eye" width="16" height="16" />
                        </Link>
                        <button 
                            onClick={() => onEdit({ ...frais, id: frais.id ?? frais._id?.toString() ?? '' })}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Modifier"
                        >
                            <Icon icon="mdi:pencil" width="16" height="16" />
                        </button>
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            title="Supprimer"
                        >
                            <Icon icon="mdi:delete" width="16" height="16" />
                        </button>
                    </div>
                </div>
                
                <div className="mt-4">
                    <p className="text-sm text-gray-700">
                        <span className="font-medium">Montant:</span> {frais.montant.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">Programmes:</span> {Array.isArray(frais.programmes) ? frais.programmes.length : 0} programmes
                    </p>
                </div>
            </div>
        </div>
    );
}