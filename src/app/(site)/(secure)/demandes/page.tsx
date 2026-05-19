import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { Icon } from "@iconify/react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Demandes | INBTP",
};

export const dynamic = "force-dynamic";

const DEMANDE_TYPES = [
  {
    id: "sessions",
    label: "Sessions",
    description: "Demandes de sessions d'enrôlement et d'examen",
    icon: "solar:calendar-date-bold-duotone",
    href: "/demandes/sessions",
    color: "bg-blue-500",
  },
  {
    id: "validations",
    label: "Validations",
    description: "Demandes de fiches de validation des acquis",
    icon: "solar:checklist-bold-duotone",
    href: "/demandes/validations",
    color: "bg-green-500",
  },
  {
    id: "releves",
    label: "Relevés",
    description: "Demandes de relevés de cotes et résultats",
    icon: "solar:document-text-bold-duotone",
    href: "/demandes/releves",
    color: "bg-purple-500",
  },
  {
    id: "laboratoires",
    label: "Laboratoires",
    description: "Demandes de bons de laboratoire et travaux pratiques",
    icon: "solar:flask-bold-duotone",
    href: "/demandes/laboratoires",
    color: "bg-amber-500",
  },
];

export default async function DemandesPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">Accès réservé aux gestionnaires de section</p>
        <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
          Vous devez être désigné comme <strong>appariteur</strong> ou <strong>secrétaire</strong> sur une section pour
          gérer les demandes.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-primary">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8zm.5-13H11v6l5.25 3.15l.75-1.23l-4.5-2.67z"/>
            </svg>
          </span>
          Demandes
        </h1>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400">Section :</span> <strong>{scope.sectionDesignation}</strong>
            <span className="hidden sm:inline">—</span>
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sectionRef = {scope.sectionSlug}</code>
          </p>
        </div>
      </header>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400">
        Consultez les demandes faites par les étudiants pour chaque type de ressource. 
        Sélectionnez une catégorie pour voir les demandes associées.
      </p>

      {/* Grid de cartes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DEMANDE_TYPES.map((type) => (
          <Link
            key={type.id}
            href={type.href}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${type.color} text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                {type.icon === "solar:calendar-date-bold-duotone" && (
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                )}
                {type.icon === "solar:checklist-bold-duotone" && (
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                )}
                {type.icon === "solar:document-text-bold-duotone" && (
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                )}
                {type.icon === "solar:flask-bold-duotone" && (
                  <path d="M9 3L7 17H17L15 3H9zm3 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm1-6H11V7h2v4z"/>
                )}
              </svg>
            </div>
            <h3 className="text-lg font-bold text-midnight_text dark:text-white">{type.label}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
              Voir les demandes
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="transition-transform group-hover:translate-x-1">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
