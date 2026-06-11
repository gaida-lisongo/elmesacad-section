'use client';

import { useEffect, useState } from "react";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import EnrollementPaymentWizard from "@/app/(site)/(secure)/section/enrollements/EnrollementPaymentWizard";
import Breadcrumb from "@/components/Common/Breadcrumb";


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
        <>
          <Breadcrumb
            pageName={row ? `Session d'enrôlement : ${row.designation}` : "Session d'enrôlement"}
            pageDescription="Gérez les enrôlements pour cette session"
            trail={[{ label: "Enrollements", href: `/etudes/${resource?.branding?.sectionSlug}` }]}
          />
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {row && (
            <EnrollementPaymentWizard
              resourceRow={row}
              sectionSlug={resource?.branding?.sectionSlug}
              type="student"
              onDone={() => {}}
              onCancel={() => {}}
            />
          )}
          </div>
          
        </>
    )
}