'use client';

import { useEffect, useState } from "react";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import EnrollementPaymentWizard from "@/app/(site)/(secure)/section/enrollements/EnrollementPaymentWizard";


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
    
    console.log("Ressource QR session :", resource);
    console.log("SessionResourceRow construite :", row);

    return (
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4">Détails de la ressource QR session</h1>
          {row && (
            <EnrollementPaymentWizard
              resourceRow={row}
              sectionSlug={resource?.branding?.sectionSlug}
              onDone={() => {}}
              onCancel={() => {}}
            />
          )}
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(row, null, 2)}</pre>
        </div>
    )
}