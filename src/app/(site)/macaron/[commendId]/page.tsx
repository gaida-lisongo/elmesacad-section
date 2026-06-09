import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CommandeDoc, CommandeModel } from '@/lib/models/Commande';

// Simulation de la base de données basée sur l'objet fourni
async function getCommandeData(commandeId: string): Promise<CommandeDoc | null> {
  // Ici vous ferez votre appel Mongoose : await db.connect(); const data = await Commande.findById(commandeId);
  const commande = await CommandeModel.findById(commandeId).lean().exec();
  if (commande) {
    return commande;
  }

  return null;
}

export default async function MacaronVerificationPage({ params }: { params: Promise<{ commandeId: string }> }) {
  const { commandeId } = await params;
  const data = await getCommandeData(commandeId);

  console.log("Données de la commande récupérées pour le macaron :", data);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm">
          <p className="text-red-500 font-semibold text-lg">Document introuvable</p>
          <p className="text-gray-500 text-sm mt-1">Ce macaron ou QR Code n'est pas valide ou a été expiré.</p>
        </div>
      </div>
    );
  }

  // Vérification de la cohérence : payé mais avec une erreur de microservice (parcours suspendu)
  const microserviceResponse = data.transaction.microserviceResponse as
    | { body?: { success?: boolean; error?: string } }
    | undefined;
  const hasAcademicIssue = microserviceResponse?.body?.success === false;
  const isFullyValid = data.status === "paid" && !hasAcademicIssue;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div
        className={`text-center p-8 rounded-2xl shadow-sm border max-w-sm ${isFullyValid ? "bg-green-50 border-green-200" : hasAcademicIssue ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}
      >
        <p className={`font-semibold text-lg ${isFullyValid ? "text-green-600" : hasAcademicIssue ? "text-yellow-600" : "text-red-600"}`}>
            {isFullyValid ? "Macaron valide" : hasAcademicIssue ? "Macaron avec attention" : "Macaron invalide"}
        </p>
        <p className="text-gray-500 text-sm mt-1">
            {isFullyValid ? "Ce macaron est valide et peut être utilisé." : hasAcademicIssue ? "Ce macaron est payé mais présente une anomalie académique. Veuillez vérifier le parcours de l'étudiant." : "Ce macaron n'est pas valide. Il peut être expiré, annulé ou ne jamais avoir été payé."}
        </p>
       </div>
    </div>
  );
}