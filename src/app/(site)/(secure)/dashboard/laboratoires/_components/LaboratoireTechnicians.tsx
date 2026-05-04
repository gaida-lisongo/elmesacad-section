"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { assignTechnicien, removeTechnicien } from "@/actions/laboratoireActions";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import type { AgentListItem } from "@/lib/services/UserManager";

export default function LaboratoireTechnicians({ laboId, techniciens }: { laboId: string; techniciens: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAssign = async (agent: AgentListItem) => {
    setLoading("assign");
    const fonction = confirm("Assigner en tant qu'Administrateur ? (Annuler pour Modérateur)") ? "admin" : "moderateur";
    await assignTechnicien(laboId, agent.id, fonction);
    setLoading(null);
  };

  const handleRemove = async (agentId: string) => {
    if (confirm("Retirer ce technicien ?")) {
      setLoading(agentId);
      await removeTechnicien(laboId, agentId);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 dark:border-gray-800 dark:bg-gray-800/20">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Ajouter un technicien</h3>
        <UserDatabaseSearch
          kind="agent"
          onSelect={handleAssign}
          placeholder="Rechercher un agent par nom, e-mail ou matricule..."
          clearOnSelect
          disabled={loading === "assign"}
        />
      </div>

      <div className="space-y-3">
        {techniciens.map((t) => (
          <div key={t.agent._id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon icon="solar:user-bold" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{t.agent.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${t.fonction === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.fonction}
                  </span>
                  <span className="text-[10px] text-gray-400">{t.agent.email}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRemove(t.agent._id)}
              disabled={loading === t.agent._id}
              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-900/20"
            >
              <Icon icon="solar:trash-bin-trash-bold" className="h-5 w-5" />
            </button>
          </div>
        ))}
        {techniciens.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">Aucun technicien assigné.</p>
        )}
      </div>
    </div>
  );
}
