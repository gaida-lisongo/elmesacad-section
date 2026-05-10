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
  const [activeTab, setActiveTab] = useState<"techniciens" | "departements">("techniciens");

  const userRole = isAdmin ? "admin" : 
                   labo.techniciens.find((t: any) => t.agent._id === session?.sub)?.fonction || "student";
  
  const userId = session?.sub;

  const tabs = [
    { id: "techniciens", label: "Techniciens", icon: "solar:eye-bold" },
    { id: "departements", label: "Départements", icon: "solar:box-bold" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
        {tabs.map((tab: any) => (
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

      {activeTab === "techniciens" && (
        <>
        <section className="space-y-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-midnight_text dark:text-white">
            <Icon icon="solar:users-group-rounded-bold-duotone" className="text-primary" />
            Gestion des Techniciens
          </h2>
          <LaboratoireTechnicians laboId={labo._id} techniciens={labo.techniciens} />
        </section>
        </>
      )}

      {activeTab === "departements" && (
        <>
          <section className="space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-midnight_text dark:text-white">
              <Icon icon="solar:structure-bold-duotone" className="text-primary" />
              Gestion des Départements
            </h2>
            <LaboratoireDepartments laboId={labo._id} initialDepartments={labo.departements} />
          </section>
        </>
      )}

    </div>
  );
}
