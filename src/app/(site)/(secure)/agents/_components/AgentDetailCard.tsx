'use client';

import Image from "next/image";
import { useMemo, useState } from "react";
import { AgentItem } from "./AgentCards";

type AuthorizationItem = {
  id?: string;
  designation: string;
  code: string;
};

type AgentDetailCardProps = {
  agent: AgentItem;
  initialAuthorizations?: AuthorizationItem[];
};

const AUTHORIZATION_BY_ROLE: Record<string, AuthorizationItem[]> = {
  admin: [
    { designation: "Moderateur", code: "MD" },
    { designation: "WebMaster", code: "WM" },
    { designation: "Super-Admin", code: "SA" },
  ],
  organisateur: [
    { designation: "Chef de section", code: "CS" },
    { designation: "Charge de l'Enseignement", code: "CE" },
    { designation: "Charge de la recherche", code: "CR" },
  ],
  gestionnaire: [
    { designation: "Appariteur", code: "APP" },
    { designation: "Secretaire", code: "SEC" },
    { designation: "Super-Admin", code: "SA" },
  ],
  titulaire: [
    { designation: "Responsable", code: "RES" },
    { designation: "Assistant", code: "ASS" },
    { designation: "Jury", code: "JR" },
  ],
};

export default function AgentDetailCard({
  agent,
  initialAuthorizations = [],
}: AgentDetailCardProps) {
  const [activeTab, setActiveTab] = useState<"informations" | "autorisations">("informations");
  const [name, setName] = useState(agent.name);
  const [email, setEmail] = useState(agent.email);
  const [matricule, setMatricule] = useState(agent.matricule);
  const [role, setRole] = useState(agent.role);
  const [authorizations, setAuthorizations] = useState<AuthorizationItem[]>(initialAuthorizations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const availableAuthorizations = useMemo(
    () => AUTHORIZATION_BY_ROLE[role] ?? [],
    [role]
  );

  const selectableAuthorizations = useMemo(
    () =>
      availableAuthorizations.filter(
        (item) => !authorizations.some((existing) => existing.code === item.code)
      ),
    [availableAuthorizations, authorizations]
  );

  const addAuthorization = async () => {
    if (!selectedCode) {
      return;
    }

    const found = availableAuthorizations.find((item) => item.code === selectedCode);
    if (!found) {
      return;
    }

    const response = await fetch("/api/authorization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        designation: found.designation,
        code: found.code,
        agentId: agent.id,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.data) {
      return;
    }

    setAuthorizations((prev) => [
      ...prev,
      {
        id: String(payload.data._id),
        designation: payload.data.designation,
        code: payload.data.code,
      },
    ]);
    setSelectedCode("");
    setIsModalOpen(false);
  };

  const removeAuthorization = async (item: AuthorizationItem) => {
    if (item.id) {
      await fetch(`/api/authorization/${item.id}`, { method: "DELETE" });
    }
    setAuthorizations((prev) => prev.filter((existing) => existing.code !== item.code));
  };

  const saveInformations = async () => {
    setIsSavingInfo(true);
    try {
      await fetch(`/api/agent/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          matricule,
          role,
        }),
      });
    } finally {
      setIsSavingInfo(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("informations")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            activeTab === "informations"
              ? "bg-[#082b1c] text-white"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          Informations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("autorisations")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            activeTab === "autorisations"
              ? "bg-[#082b1c] text-white"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          Autorisations
        </button>
      </div>

      {activeTab === "informations" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            name="name"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            name="email"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={matricule}
            onChange={(event) => setMatricule(event.target.value)}
            name="matricule"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="admin">admin</option>
            <option value="organisateur">organisateur</option>
            <option value="gestionnaire">gestionnaire</option>
            <option value="titulaire">titulaire</option>
          </select>
          <div className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Status: {agent.status}
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-xs text-gray-500">Photo (lecture)</p>
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <Image
                src={agent.photo || "/images/blog/blog_2.jpg"}
                alt={agent.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={saveInformations}
              disabled={isSavingInfo}
              className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSavingInfo ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Liste des autorisations de l&apos;agent ({authorizations.length})
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white"
            >
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {authorizations.map((authorization) => (
              <div
                key={authorization.code}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                <div>
                  <p className="text-sm font-semibold text-midnight_text dark:text-white">
                    {authorization.designation}
                  </p>
                  <p className="text-xs text-gray-500">Code: {authorization.code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAuthorization(authorization)}
                  className="rounded-md bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-gray-900">
            <h4 className="text-base font-semibold text-midnight_text dark:text-white">
              Ajouter une autorisation
            </h4>
            <p className="mt-1 text-xs text-gray-500">
              AgentId: {agent.id} | Role: {role}
            </p>

            <select
              value={selectedCode}
              onChange={(event) => setSelectedCode(event.target.value)}
              className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Selectionner une autorisation</option>
              {selectableAuthorizations.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.designation} ({item.code})
                </option>
              ))}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={addAuthorization}
                className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
