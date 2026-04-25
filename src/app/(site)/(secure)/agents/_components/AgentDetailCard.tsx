'use client';

import Image from "next/image";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
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

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-[#082b1c]/40 focus:outline-none focus:ring-2 focus:ring-[#082b1c]/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

const tabBase =
  "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300";

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
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-gray-100/80 p-1.5 ring-1 ring-gray-200/60 dark:bg-gray-800/50 dark:ring-gray-700/60">
        <button
          type="button"
          onClick={() => setActiveTab("informations")}
          className={`${tabBase} ${
            activeTab === "informations"
              ? "bg-gradient-to-r from-[#082b1c] to-[#0d4a2f] text-white shadow-lg shadow-[#082b1c]/25"
              : "text-gray-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
          }`}
        >
          <Icon icon="solar:user-id-bold-duotone" className="h-5 w-5" />
          Informations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("autorisations")}
          className={`${tabBase} ${
            activeTab === "autorisations"
              ? "bg-gradient-to-r from-[#082b1c] to-[#0d4a2f] text-white shadow-lg shadow-[#082b1c]/25"
              : "text-gray-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
          }`}
        >
          <Icon icon="solar:shield-keyhole-bold-duotone" className="h-5 w-5" />
          Autorisations
        </button>
      </div>

      {activeTab === "informations" ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-white to-gray-50/90 p-6 shadow-[0_4px_24px_-4px_rgba(8,43,28,0.1),0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/95 dark:border-gray-700/80">
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <Icon icon="solar:pen-new-square-bold-duotone" className="h-5 w-5" />
            Fiche agent
          </h3>
          <div className="relative grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:user-bold-duotone" className="h-4 w-4 text-primary" />
                Nom
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                name="name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:letter-bold-duotone" className="h-4 w-4 text-primary" />
                Email
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                name="email"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:id-card-bold-duotone" className="h-4 w-4 text-primary" />
                Matricule
              </label>
              <input
                value={matricule}
                onChange={(event) => setMatricule(event.target.value)}
                name="matricule"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:user-speak-bold-duotone" className="h-4 w-4 text-primary" />
                Rôle
              </label>
              <select
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className={inputClass}
              >
                <option value="admin">admin</option>
                <option value="organisateur">organisateur</option>
                <option value="gestionnaire">gestionnaire</option>
                <option value="titulaire">titulaire</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Statut</label>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3">
                <Icon
                  icon={agent.status === "active" ? "solar:check-circle-bold" : "solar:clock-circle-bold"}
                  className={`h-5 w-5 ${agent.status === "active" ? "text-emerald-600" : "text-amber-600"}`}
                />
                <span className="text-sm font-medium capitalize text-midnight_text dark:text-white">
                  {agent.status}
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:gallery-bold-duotone" className="h-4 w-4" />
                Photo
              </p>
              <div className="relative h-36 w-36 overflow-hidden rounded-2xl border-4 border-white shadow-xl ring-2 ring-primary/15 dark:border-gray-800">
                <Image
                  src={agent.photo || "/images/blog/blog_2.jpg"}
                  alt={agent.name}
                  fill
                  className="object-cover transition duration-500 hover:scale-105"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={saveInformations}
                disabled={isSavingInfo}
                className="group/save inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#082b1c] to-[#0d4a2f] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#082b1c]/25 transition duration-300 hover:scale-[1.01] hover:shadow-xl disabled:opacity-60 md:w-auto"
              >
                <Icon icon="solar:diskette-bold" className="h-5 w-5 transition group-hover/save:scale-110" />
                {isSavingInfo ? "Enregistrement…" : "Enregistrer les informations"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-white to-gray-50/90 p-6 shadow-[0_4px_24px_-4px_rgba(8,43,28,0.1)] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/95 dark:border-gray-700/80">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {authorizations.length}
              </span>
              autorisation{authorizations.length > 1 ? "s" : ""} liée{authorizations.length > 1 ? "s" : ""} à cet agent
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#082b1c] to-[#0d4a2f] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#082b1c]/20 transition hover:scale-[1.02] hover:shadow-xl"
            >
              <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
              Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {authorizations.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Aucune autorisation pour le moment. Utilisez « Ajouter » pour en associer.
              </p>
            )}
            {authorizations.map((authorization) => (
              <div
                key={authorization.code}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-100/90 bg-white/80 px-4 py-3 shadow-md shadow-gray-200/50 ring-1 ring-gray-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700/80 dark:bg-gray-800/40 dark:shadow-none dark:ring-gray-600/50"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon icon="solar:key-minimalistic-bold-duotone" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-midnight_text dark:text-white">
                      {authorization.designation}
                    </p>
                    <p className="text-xs text-gray-500">Code {authorization.code}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAuthorization(authorization)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
                >
                  <Icon icon="solar:trash-bin-2-bold" className="h-4 w-4" />
                  Retirer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm transition"
            onClick={() => setIsModalOpen(false)}
            aria-label="Fermer"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-white to-gray-50/95 p-0 shadow-[0_24px_64px_-12px_rgba(8,43,28,0.35)] dark:from-gray-900 dark:to-gray-950">
            <div className="border-b border-gray-200/80 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4 dark:border-gray-700">
              <h4
                id="auth-modal-title"
                className="flex items-center gap-2 text-lg font-bold text-midnight_text dark:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon icon="solar:shield-user-bold" className="h-6 w-6" />
                </span>
                Nouvelle autorisation
              </h4>
              <p className="mt-1 pl-12 text-xs text-gray-500 dark:text-gray-400">
                Rôle actuel : <span className="font-semibold text-midnight_text dark:text-white">{role}</span>
              </p>
            </div>

            <div className="p-5">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Icon icon="solar:list-check-bold" className="h-4 w-4" />
                Choisir une autorisation
              </label>
              <select
                value={selectedCode}
                onChange={(event) => setSelectedCode(event.target.value)}
                className={inputClass}
              >
                <option value="">Sélectionner…</option>
                {selectableAuthorizations.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.designation} ({item.code})
                  </option>
                ))}
              </select>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={addAuthorization}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#082b1c] to-[#0d4a2f] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#082b1c]/25"
                >
                  <Icon icon="solar:check-circle-bold" className="h-5 w-5" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
