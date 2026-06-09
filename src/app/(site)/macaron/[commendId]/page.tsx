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
  const hasAcademicIssue = data.transaction.microserviceResponse?.body && (data.transaction.microserviceResponse.body as any).success === false;
  const isFullyValid = data.status === "paid" && !hasAcademicIssue;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header de Statut Visuel rapide pour le contrôleur */}
        <div className={`p-6 text-center ${isFullyValid ? 'bg-emerald-600' : 'bg-amber-500'} text-white`}>
          <div className="inline-flex p-3 rounded-full bg-white/20 mb-2 animate-pulse">
            {isFullyValid ? (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isFullyValid ? "Document Vérifié & Valide" : "Vérification Partielle"}
          </h1>
          <p className="text-white/80 text-xs mt-1 uppercase tracking-wider font-semibold">
            N° {data.transaction.orderNumber}
          </p>
        </div>

        {/* Corps du Macaron */}
        <div className="p-6 space-y-6">
          
          {/* Section Étudiant */}
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Étudiant</span>
            <div className="flex items-center justify-between mt-1">
              <h2 className="text-xl font-bold text-slate-800">{data.ressource.metadata.fullName}</h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-mono font-semibold">
                {data.student.matricule}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{data.student.email}</p>
          </div>

          {/* Section Ressource / Examen */}
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prestation</span>
            <h3 className="text-base font-semibold text-slate-800 mt-1">{data.ressource.metadata.productTitle}</h3>
            <div className="flex gap-2 mt-2">
              <span className="bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded font-medium uppercase">
                {data.ressource.categorie}
              </span>
              <span className="bg-slate-50 text-slate-600 text-[11px] px-2 py-0.5 rounded font-mono">
                Ref: {data.ressource.reference.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Section Paiement Financier */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Statut Financier :</span>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {data.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Montant versé :</span>
              <span className="font-bold text-slate-800">{data.transaction.amount} {data.transaction.currency}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-200/60 pt-2">
              <span>Date de paiement :</span>
              <span>{format(new Date(data.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
            </div>
          </div>

          {/* Alerte Bloquante / Académique (Microservice Error) */}
          {hasAcademicIssue && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-bold text-red-800">Blocage Pédagogique</h4>
                  <p className="text-xs text-red-700 mt-1">
                    {data.transaction.microserviceResponse.body.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Sécurisé */}
        <div className="bg-slate-100 px-6 py-4 flex justify-between items-center text-[11px] text-slate-400 font-mono border-t border-slate-200">
          <span>ID: {data._id.slice(0, 12)}...</span>
          <span>INBTP • Système de Vérification</span>
        </div>
      </div>
    </div>
  );
}