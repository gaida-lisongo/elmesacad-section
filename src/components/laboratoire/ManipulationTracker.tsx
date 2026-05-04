"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import { formatStandardDate } from "@/utils/formatDate";
import { gradeManipulation, submitManipulationRapport } from "@/actions/laboratoireActions";

interface ManipulationTrackerProps {
  manipulations: any[];
  userRole: "admin" | "moderateur" | "student";
  userId: string;
}

export default function ManipulationTracker({ manipulations, userRole, userId }: ManipulationTrackerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGrade = async (manipId: string, studentId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(`${manipId}-${studentId}`);
    const fd = new FormData(e.currentTarget);
    const data = {
      score: Number(fd.get("score")),
      observations: fd.get("observations"),
      decision: fd.get("decision"),
    };
    await gradeManipulation(manipId, studentId, data);
    setLoading(null);
  };

  const handleUpload = async (manipId: string) => {
    const url = prompt("Lien du rapport (simulation) :");
    if (url) {
      setLoading(manipId);
      await submitManipulationRapport(manipId, userId, url);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {manipulations.map((manip) => (
        <div key={manip._id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-midnight_text dark:text-white">{manip.titre}</h3>
              <p className="text-sm text-gray-500">{manip.description}</p>
            </div>
            <div className="flex gap-2">
              {manip.objectifs.map((obj: string, i: number) => (
                <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
                  {obj}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Étudiant</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Rapport</th>
                  <th className="px-4 py-3 font-semibold">Score / Décision</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {manip.etudiantsInscrits.map((inscrit: any) => {
                  const isUser = inscrit.etudiant === userId;
                  const canGrade = userRole === "admin" || userRole === "moderateur";

                  return (
                    <tr key={inscrit.etudiant}>
                      <td className="px-4 py-4 font-medium">{inscrit.etudiant.name || inscrit.etudiant}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          inscrit.status === "corrige" ? "bg-emerald-100 text-emerald-700" :
                          inscrit.status === "soumis" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {inscrit.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {inscrit.rapportUrl ? (
                          <a href={inscrit.rapportUrl} target="_blank" className="flex items-center gap-1 text-primary hover:underline">
                            <Icon icon="solar:document-bold" />
                            Voir le rapport
                          </a>
                        ) : "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        {inscrit.status === "corrige" ? (
                          <div className="flex flex-col">
                            <span className="font-bold">{inscrit.score}/20</span>
                            <span className="text-[10px] text-gray-400 uppercase">{inscrit.decision}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-4">
                        {isUser && inscrit.status === "en_attente" && (
                          <button
                            onClick={() => handleUpload(manip._id)}
                            disabled={loading === manip._id}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Soumettre
                          </button>
                        )}
                        {canGrade && inscrit.status === "soumis" && (
                          <form onSubmit={(e) => handleGrade(manip._id, inscrit.etudiant, e)} className="flex items-center gap-2">
                            <input name="score" type="number" placeholder="Note" className="w-16 rounded-md border border-gray-200 px-2 py-1 text-xs dark:bg-gray-800" required />
                            <select name="decision" className="rounded-md border border-gray-200 px-2 py-1 text-xs dark:bg-gray-800">
                              <option value="valide">Valide</option>
                              <option value="echec">Échec</option>
                              <option value="a_refaire">À refaire</option>
                            </select>
                            <button
                              type="submit"
                              disabled={loading === `${manip._id}-${inscrit.etudiant}`}
                              className="rounded-md bg-darkprimary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Noter
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
