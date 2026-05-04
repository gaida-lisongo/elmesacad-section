"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import EquipmentCard from "@/components/laboratoire/EquipmentCard";
import ManipulationTracker from "@/components/laboratoire/ManipulationTracker";
import LaboratoireTechnicians from "./LaboratoireTechnicians";
import LaboratoireDepartments from "./LaboratoireDepartments";

interface Props {
  labo: any;
  equipments: any[];
  manipulations: any[];
  session: any;
}

export default function LaboratoireDetailCard({ labo, equipments, manipulations, session }: Props) {
  const isAdmin = session?.role === "admin";
  const [activeTab, setActiveTab] = useState<"overview" | "equipments" | "manipulations" | "admin">("overview");

  const userRole = isAdmin ? "admin" : 
                   labo.techniciens.find((t: any) => t.agent._id === session?.sub)?.fonction || "student";
  
  const userId = session?.sub;

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: "solar:eye-bold" },
    { id: "equipments", label: "Équipements", icon: "solar:box-bold" },
    { id: "manipulations", label: "Manipulations", icon: "solar:clapperboard-edit-bold" },
  ];

  if (isAdmin) {
    tabs.push({ id: "admin", label: "Administration", icon: "solar:settings-bold" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.id 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <Icon icon={tab.icon} className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-gray-50/30 p-6 dark:border-gray-800 dark:bg-gray-800/20">
              <h2 className="mb-4 text-xl font-bold">Départements</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {labo.departements.map((dept: any, i: number) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="font-bold text-primary">{dept.designation}</h3>
                    {dept.description.map((desc: any, j: number) => (
                      <div key={j} className="mt-2">
                        <p className="text-xs font-semibold uppercase text-gray-400">{desc.title}</p>
                        <ul className="list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                          {desc.contenu.map((item: string, k: number) => (
                            <li key={k}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-gray-50/30 p-6 dark:border-gray-800 dark:bg-gray-800/20">
              <h2 className="mb-4 text-xl font-bold">Techniciens</h2>
              <div className="space-y-3">
                {labo.techniciens.map((tech: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon icon="solar:user-bold" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{tech.agent.name}</p>
                      <p className="text-xs text-gray-500 uppercase">{tech.fonction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "equipments" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {equipments.map((equip) => (
            <EquipmentCard key={equip._id} equipement={equip} />
          ))}
          {equipments.length === 0 && (
            <p className="col-span-full py-12 text-center text-gray-500">Aucun équipement répertorié.</p>
          )}
        </div>
      )}

      {activeTab === "manipulations" && (
        <ManipulationTracker manipulations={manipulations} userRole={userRole as any} userId={userId} />
      )}

      {activeTab === "admin" && isAdmin && (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-midnight_text dark:text-white">
              <Icon icon="solar:users-group-rounded-bold-duotone" className="text-primary" />
              Gestion des Techniciens
            </h2>
            <LaboratoireTechnicians laboId={labo._id} techniciens={labo.techniciens} />
          </section>
          <section className="space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-midnight_text dark:text-white">
              <Icon icon="solar:structure-bold-duotone" className="text-primary" />
              Gestion des Départements
            </h2>
            <LaboratoireDepartments laboId={labo._id} initialDepartments={labo.departements} />
          </section>
        </div>
      )}
    </div>
  );
}
