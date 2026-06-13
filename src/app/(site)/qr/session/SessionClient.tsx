'use client';

import { useEffect, useState } from "react";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import EnrollementPaymentWizard from "@/app/(site)/(secure)/section/enrollements/EnrollementPaymentWizard";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { PaiementCommandeClientPayload, PaiementEtudiantLocalView, PaiementProduitDetailRecord } from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierSessionPanel from "@/app/paiement/_components/metier/PaiementMetierSessionPanel";


export default function SessionClient({ resource }: { resource: any }) {
    const [row, setRow] = useState<SessionResourceRow | null>({
        id: resource._id,
        designation: resource.designation,  
        amount: resource.amount,
        currency: resource.currency,
        status: resource.status,
        brandingSectionRef: resource.branding?.sectionSlug || "unknown",
        matieresCount: resource?.matieres.length || 0,
        matieresSummary: resource?.matieres.map((m: any) => m.designation).join(", ") || "",
    });
    const [ui, setUi] = useState<"form" | "pending" | "generated" | "error">("form");
    const [commande, setCommande] = useState<PaiementCommandeClientPayload | null>(null)
    const [etudiant, setEtudiant] = useState<PaiementEtudiantLocalView | null>(null);
    const [produitDetail, setProduitDetail] = useState<PaiementProduitDetailRecord | null>(null)

    
    console.log("Ressource QR session :", resource);
    console.log("SessionResourceRow construite :", row);

    const handleGenerate = ({commandeData, etudiantData, produitData}: {commandeData: PaiementCommandeClientPayload, etudiantData: PaiementEtudiantLocalView, produitData: PaiementProduitDetailRecord}) => {
      setCommande(commandeData);
      setEtudiant(etudiantData);
      setProduitDetail(produitData);
      setUi('generated')
    }

    const handlePending = ({commandeData, etudiantData}: {commandeData: PaiementCommandeClientPayload, etudiantData: PaiementEtudiantLocalView}) => {
      setCommande(commandeData);
      setEtudiant(etudiantData);
      setUi('pending')
    }

    return (
        <>
          <Breadcrumb
            pageName={row ? `Session d'enrôlement : ${row.designation}` : "Session d'enrôlement"}
            pageDescription="Gérez les enrôlements pour cette session"
            trail={[{ label: "Enrollements", href: `/etudes/${resource?.branding?.sectionSlug}` }]}
          />
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {(row && ui === "form") && (
            <EnrollementPaymentWizard
              resourceRow={row}
              sectionSlug={resource?.branding?.sectionSlug}
              type="student"
              onDone={(data: any) => {
                // Après paiement réussi, on peut rafraîchir la page
                console.log("Data from generating macaron: ", data);
                const { commande: cmd, commandeId, etudiant: stud, produitDetail: prod} = data;

                if(cmd?.status == "paid" || cmd?.status == "completed") {
                  handleGenerate({
                    commandeData: cmd as PaiementCommandeClientPayload,
                    etudiantData: stud as PaiementEtudiantLocalView,
                    produitData: prod as PaiementProduitDetailRecord
                  });
                } else {
                  handlePending({
                    commandeData: cmd as PaiementCommandeClientPayload,
                    etudiantData: stud as PaiementEtudiantLocalView,
                  });
                }
                
              }}
              onCancel={() => window.location.reload()}
            />
          )}

          {(commande && ui === "generated") && (
            <PaiementMetierSessionPanel 
              commande={commande}
              commandeId={commande?.id || ''}
              produitDetail={produitDetail}
              etudiant={etudiant}
            />
          )}

          {(commande && ui === "pending") && (
            <div>
              <p>Votre commande est en {commande?.status || ''}</p>
            </div>
          )}
          </div>
          
        </>
    )
}