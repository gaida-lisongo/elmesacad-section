"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createChargeHoraireAction,
  deleteChargeHoraireAction,
  getUniteChargeContextAction,
  listChargesHorairesAction,
  updateChargeHoraireAction,
} from "@/actions/chargesHorairesTitulaire";
import { PageListe } from "@/components/Layout/PageListe";
import { SearchUser } from "@/components/secure/UserDatabaseSearch";
import type { AgentListItem } from "@/lib/services/UserManager";

type MatiereRow = { _id: string; designation: string; credits: number; code: string };
type ChargeContext = {
  sectionId: string;
  programmeId: string;
  programmeDesignation: string;
  programmeSlug: string;
  semestreDesignation: string;
  unite: { _id: string; designation: string; code: string; credits: number };
  matieres: MatiereRow[];
};

type ChargeStatus = "pending" | "finish" | "no";

const chargeStatusLabel: Record<ChargeStatus, string> = {
  pending: "En cours",
  finish: "Terminée",
  no: "Programmé",
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseChargeStatus(v: unknown): ChargeStatus {
  return v === "pending" || v === "finish" || v === "no" ? v : "no";
}

function parseChargeForEdit(charge: unknown): {
  titulaire: typeof emptyTitulaire;
  horaire: typeof emptyHoraire;
  status: ChargeStatus;
} {
  if (!charge || typeof charge !== "object") {
    return { titulaire: emptyTitulaire, horaire: emptyHoraire, status: "no" };
  }
  const o = charge as {
    titulaire?: Partial<typeof emptyTitulaire>;
    horaire?: Partial<typeof emptyHoraire>;
    status?: unknown;
  };
  return {
    titulaire: {
      name: safeStr(o.titulaire?.name),
      matricule: safeStr(o.titulaire?.matricule),
      email: safeStr(o.titulaire?.email),
      telephone: safeStr(o.titulaire?.telephone),
      disponibilite: safeStr(o.titulaire?.disponibilite),
    },
    horaire: {
      jour: safeStr(o.horaire?.jour),
      heure_debut: safeStr(o.horaire?.heure_debut),
      heure_fin: safeStr(o.horaire?.heure_fin),
      date_debut: safeStr(o.horaire?.date_debut),
      date_fin: safeStr(o.horaire?.date_fin),
    },
    status: parseChargeStatus(o.status),
  };
}

function chargeId(c: unknown): string | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  if (o._id != null) return String(o._id);
  if (o.id != null) return String(o.id);
  return null;
}

function chargeMatchesMatiere(charge: unknown, matiere: MatiereRow): boolean {
  if (!charge || typeof charge !== "object") return false;
  const m = (charge as { matiere?: { reference?: string; designation?: string } }).matiere;
  const ref = (m?.reference ?? "").trim();
  if (!ref) return false;
  return ref === matiere.code || ref === matiere._id;
}

function formatChargeSummary(c: unknown): string {
  if (!c || typeof c !== "object") return "—";
  const o = c as {
    horaire?: { jour?: string; heure_debut?: string; heure_fin?: string };
    titulaire?: { name?: string };
    matiere?: { designation?: string };
  };
  const jour = o.horaire?.jour ?? "";
  const h = [o.horaire?.heure_debut, o.horaire?.heure_fin].filter(Boolean).join("–");
  const tit = o.titulaire?.name ?? "";
  const parts = [o.matiere?.designation, jour, h, tit].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

const emptyTitulaire = {
  name: "",
  matricule: "",
  email: "",
  telephone: "",
  disponibilite: "",
};

const emptyHoraire = {
  jour: "",
  heure_debut: "",
  heure_fin: "",
  date_debut: "",
  date_fin: "",
};

export default function ChargeMatiereClient({
  programmeId,
  uniteId,
}: {
  programmeId: string;
  uniteId: string;
}) {
  const [ctx, setCtx] = useState<ChargeContext | null>(null);
  const [ctxErr, setCtxErr] = useState<string | null>(null);
  const [charges, setCharges] = useState<unknown[]>([]);
  const [chargesErr, setChargesErr] = useState<string | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [search, setSearch] = useState("");
  const [activeMatiereId, setActiveMatiereId] = useState<string | null>(null);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);
  const [titulaire, setTitulaire] = useState(emptyTitulaire);
  const [horaire, setHoraire] = useState(emptyHoraire);
  const [status, setStatus] = useState<ChargeStatus>("no");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoadingCtx(true);
    setCtxErr(null);
    try {
      const r = await getUniteChargeContextAction(programmeId, uniteId);
      if (!r.ok) {
        setCtx(null);
        setCtxErr(r.message);
        return;
      }
      const data = r.data as ChargeContext;
      setCtx(data);
      if (data.matieres?.length) {
        setActiveMatiereId((prev) =>
          prev && data.matieres.some((m) => m._id === prev) ? prev : data.matieres[0]._id
        );
      }
    } catch {
      setCtx(null);
      setCtxErr("Erreur réseau");
    } finally {
      setLoadingCtx(false);
    }
  }, [programmeId, uniteId]);

  const loadCharges = useCallback(
    async (sectionId: string, uniteCode: string, matiereReference: string | undefined) => {
    setLoadingCharges(true);
    setChargesErr(null);
    try {
      const r = await listChargesHorairesAction(sectionId, {
        code_unite: uniteCode,
        matiere_reference: matiereReference,
      });
      if (!r.ok) {
        setCharges([]);
        setChargesErr(r.message);
        return;
      }
      setCharges(r.data ?? []);
    } catch {
      setCharges([]);
      setChargesErr("Erreur réseau");
    } finally {
      setLoadingCharges(false);
    }
    },
    []
  );

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const activeMatiere = useMemo(
    () => ctx?.matieres.find((m) => m._id === activeMatiereId) ?? null,
    [ctx, activeMatiereId]
  );

  useEffect(() => {
    if (!ctx?.sectionId || !ctx?.unite?.code || !activeMatiere?._id) return;
    loadCharges(ctx.sectionId, ctx.unite.code, activeMatiere._id);
  }, [ctx?.sectionId, ctx?.unite?.code, activeMatiere?._id, loadCharges]);

  const matieresFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!ctx?.matieres) return [];
    if (!q) return ctx.matieres;
    return ctx.matieres.filter(
      (m) =>
        m.designation.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m._id.toLowerCase().includes(q)
    );
  }, [ctx, search]);

  const chargesForActive = useMemo(() => {
    if (!activeMatiere) return [];
    return charges.filter((c) => chargeMatchesMatiere(c, activeMatiere));
  }, [charges, activeMatiere]);

  const openCreate = () => {
    if (!activeMatiere || !ctx) return;
    setModal("create");
    setFormStep(1);
    setSelectedAgent(null);
    setEditingId(null);
    setFormErr(null);
    setTitulaire(emptyTitulaire);
    setHoraire(emptyHoraire);
    setStatus("no");
  };

  const openEdit = (c: unknown) => {
    const id = chargeId(c);
    if (!id || !ctx) return;
    const parsed = parseChargeForEdit(c);
    setModal("edit");
    setFormStep(1);
    setSelectedAgent(null);
    setEditingId(id);
    setFormErr(null);
    setTitulaire(parsed.titulaire);
    setHoraire(parsed.horaire);
    setStatus(parsed.status);
  };

  const submitCreate = async () => {
    if (!ctx || !activeMatiere) return;
    if (!titulaire.name.trim() || !titulaire.email.trim()) {
      setFormErr("Nom et e-mail du titulaire requis.");
      return;
    }
    if (!horaire.jour.trim() || !horaire.heure_debut.trim() || !horaire.heure_fin.trim()) {
      setFormErr("Jour et plage horaire requise.");
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      const r = await createChargeHoraireAction({
        programmeId: ctx.programmeId,
        sectionId: ctx.sectionId,
        uniteId: ctx.unite._id,
        matiereId: activeMatiere._id,
        semestreDesignation: ctx.semestreDesignation,
        promotion: {
          designation: ctx.programmeDesignation,
          reference: ctx.programmeId,
        },
        titulaire: {
          name: titulaire.name.trim(),
          matricule: titulaire.matricule.trim(),
          email: titulaire.email.trim(),
          telephone: titulaire.telephone.trim(),
          disponibilite: titulaire.disponibilite.trim(),
        },
        horaire: {
          jour: horaire.jour.trim(),
          heure_debut: horaire.heure_debut.trim(),
          heure_fin: horaire.heure_fin.trim(),
          date_debut: horaire.date_debut.trim() || undefined,
          date_fin: horaire.date_fin.trim() || undefined,
        },
        status,
      });
      if (!r.ok) throw new Error(r.message);
      setModal(null);
      await loadCharges(ctx.sectionId, ctx.unite.code, activeMatiere._id);
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  function validateCreateStep1(): string | null {
    if (modal === "create" && !selectedAgent) return "Sélectionnez un agent titulaire.";
    if (!titulaire.name.trim() || !titulaire.email.trim()) {
      return "Nom et e-mail du titulaire requis.";
    }
    if (!titulaire.disponibilite.trim()) return "Définissez la disponibilité du titulaire.";
    return null;
  }

  function validateCreateStep2(): string | null {
    if (!horaire.jour.trim()) return "Renseignez le jour du cours.";
    if (!horaire.heure_debut.trim() || !horaire.heure_fin.trim()) {
      return "Heure de début et heure de fin requises.";
    }
    if (!horaire.date_debut.trim() || !horaire.date_fin.trim()) {
      return "Date de début et date de fin requises.";
    }
    return null;
  }

  const submitEdit = async () => {
    if (!ctx || !editingId) return;
    setSaving(true);
    setFormErr(null);
    try {
      const r = await updateChargeHoraireAction(ctx.sectionId, editingId, {
        status,
        matiere: {
          designation: activeMatiere?.designation ?? "",
          reference: activeMatiere?._id ?? "",
        },
        unite: {
          designation: ctx.unite.designation,
          code_unite: ctx.unite.code,
          semestre: ctx.semestreDesignation || "—",
        },
        promotion: {
          designation: ctx.programmeDesignation,
          reference: ctx.programmeId,
        },
        titulaire: {
          name: titulaire.name.trim(),
          matricule: titulaire.matricule.trim(),
          email: titulaire.email.trim(),
          telephone: titulaire.telephone.trim(),
          disponibilite: titulaire.disponibilite.trim(),
        },
        horaire: {
          jour: horaire.jour.trim(),
          heure_debut: horaire.heure_debut.trim(),
          heure_fin: horaire.heure_fin.trim(),
          date_debut: horaire.date_debut.trim() || undefined,
          date_fin: horaire.date_fin.trim() || undefined,
        },
      });
      if (!r.ok) throw new Error(r.message);
      setModal(null);
      await loadCharges(ctx.sectionId, ctx.unite.code, activeMatiere?._id);
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!ctx || !window.confirm("Supprimer cette charge horaire ?")) return;
    try {
      const r = await deleteChargeHoraireAction(ctx.sectionId, id);
      if (!r.ok) throw new Error(r.message);
      await loadCharges(ctx.sectionId, ctx.unite.code, activeMatiere?._id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loadingCtx) {
    return <p className="text-sm text-gray-500">Chargement…</p>;
  }
  if (ctxErr || !ctx) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {ctxErr ?? "Erreur"}
      </div>
    );
  }

  return (
    <>
      <PageListe
        heading={
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Charges horaires — unité</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {ctx.programmeDesignation} · {ctx.semestreDesignation} ·{" "}
              <span className="font-medium">{ctx.unite.designation}</span>{" "}
              <span className="font-mono text-xs">({ctx.unite.code})</span>
            </p>
          </div>
        }
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
            >
              Tableau de bord
            </Link>
            <button
              type="button"
              onClick={openCreate}
              disabled={!activeMatiere}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-primary dark:text-gray-900"
            >
              Nouvelle charge
            </button>
          </div>
        }
        sidebar={
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Matières de l’unité
              </h2>
              <label className="mt-2 block text-xs text-gray-600 dark:text-gray-400">
                Recherche
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, code…"
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {matieresFiltered.map((m) => (
                  <li key={m._id}>
                    <button
                      type="button"
                      onClick={() => setActiveMatiereId(m._id)}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                        m._id === activeMatiereId
                          ? "bg-primary/10 font-semibold text-primary dark:bg-primary/15 dark:text-emerald-200"
                          : "text-midnight_text hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="block truncate">{m.designation}</span>
                      <span className="block font-mono text-[11px] text-gray-500">{m.code || m._id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        }
      >
        {chargesErr ? (
          <p className="text-sm text-red-600 dark:text-red-400">{chargesErr}</p>
        ) : loadingCharges ? (
          <p className="text-sm text-gray-500">Chargement des charges…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Résumé</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Statut</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900/40">
                {chargesForActive.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                      Aucune charge pour cette matière. Créez-en une ou vérifiez le service titulaire (
                      <code className="text-xs">TITULAIRE_SERVICE</code>).
                    </td>
                  </tr>
                ) : (
                  chargesForActive.map((c, idx) => {
                    const id = chargeId(c);
                    const st = (c && typeof c === "object" ? (c as { status?: ChargeStatus }).status : undefined) ?? "no";
                    return (
                      <tr key={id ?? `charge-row-${idx}`}>
                        <td className="px-3 py-2 text-midnight_text dark:text-white">
                          {formatChargeSummary(c)}
                        </td>
                        <td className="px-3 py-2">{chargeStatusLabel[st]}</td>
                        <td className="px-3 py-2 text-right">
                          {id ? (
                            <span className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="text-xs font-medium text-primary underline dark:text-primary"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => del(id)}
                                className="text-xs font-medium text-red-600 underline dark:text-red-400"
                              >
                                Supprimer
                              </button>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </PageListe>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-midnight_text dark:text-white">
              {modal === "create" ? "Nouvelle charge" : "Modifier la charge"}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Étape {formStep} sur 3</p>
            {activeMatiere ? (
              <p className="mt-1 text-xs text-gray-500">
                Matière : <strong>{activeMatiere.designation}</strong> ({activeMatiere.code || activeMatiere._id})
              </p>
            ) : null}
            {formErr ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErr}</p>
            ) : null}
            <div className="mt-4 space-y-3">
              {formStep === 1 ? (
                <>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Rechercher le titulaire (agent)
                  </p>
                  <SearchUser
                    kind="agent"
                    clearOnSelect
                    onSelect={(agent) => {
                      setSelectedAgent(agent);
                      setTitulaire((prev) => ({
                        ...prev,
                        name: agent.name ?? "",
                        email: agent.email ?? "",
                        matricule: agent.matricule ?? "",
                      }));
                    }}
                    placeholder="Nom, e-mail ou matricule du titulaire…"
                  />
                  {selectedAgent ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                      <p className="font-medium text-gray-700 dark:text-gray-200">{selectedAgent.name}</p>
                      <p className="text-gray-500 dark:text-gray-400">{selectedAgent.email}</p>
                      <p className="text-gray-500 dark:text-gray-400">Matricule: {selectedAgent.matricule}</p>
                    </div>
                  ) : null}
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Disponibilité
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="Ex. lun-mer 08h-12h"
                      value={titulaire.disponibilite}
                      onChange={(e) => setTitulaire((t) => ({ ...t, disponibilite: e.target.value }))}
                    />
                  </label>
                </>
              ) : null}

              {formStep === 2 ? (
                <>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Définition de l’horaire</p>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Jour
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="Ex. Mercredi"
                      value={horaire.jour}
                      onChange={(e) => setHoraire((h) => ({ ...h, jour: e.target.value }))}
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Heure début
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={horaire.heure_debut}
                        onChange={(e) => setHoraire((h) => ({ ...h, heure_debut: e.target.value }))}
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Heure fin
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={horaire.heure_fin}
                        onChange={(e) => setHoraire((h) => ({ ...h, heure_fin: e.target.value }))}
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Date début
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={horaire.date_debut}
                        onChange={(e) => setHoraire((h) => ({ ...h, date_debut: e.target.value }))}
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Date fin
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={horaire.date_fin}
                        onChange={(e) => setHoraire((h) => ({ ...h, date_fin: e.target.value }))}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {formStep === 3 ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Titulaire</p>
                    <p className="mt-1 font-medium text-midnight_text dark:text-white">{titulaire.name || "—"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{titulaire.email || "—"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Matricule: {titulaire.matricule || "—"} · Disponibilité: {titulaire.disponibilite || "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Horaire</p>
                    <p className="mt-1 text-gray-700 dark:text-gray-200">
                      {horaire.jour} · {horaire.heure_debut}–{horaire.heure_fin}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Du {horaire.date_debut} au {horaire.date_fin}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payload ciblé</p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      Matière: {activeMatiere?.designation} (ref: {activeMatiere?._id})
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Unité: {ctx.unite.designation} ({ctx.unite.code})
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Promotion: {ctx.programmeDesignation} (ref: {ctx.programmeId})
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Descripteur: vide (sous-propriétés initialisées)</p>
                  </div>
                </div>
              ) : null}
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Statut du cours
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ChargeStatus)}
                >
                  <option value="no">Programmé</option>
                  <option value="pending">En cours</option>
                  <option value="finish">Terminée</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
              >
                Annuler
              </button>
              <>
                {formStep > 1 ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setFormErr(null);
                      setFormStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                  >
                    Retour
                  </button>
                ) : null}
                {formStep < 3 ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setFormErr(null);
                      if (formStep === 1) {
                        const err = validateCreateStep1();
                        if (err) {
                          setFormErr(err);
                          return;
                        }
                      }
                      if (formStep === 2) {
                        const err = validateCreateStep2();
                        if (err) {
                          setFormErr(err);
                          return;
                        }
                      }
                      setFormStep((s) => ((s + 1) as 1 | 2 | 3));
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
                  >
                    Suivant
                  </button>
                ) : modal === "create" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitCreate}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
                  >
                    {saving ? "…" : "Confirmer et soumettre"}
                  </button>
                ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={submitEdit}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
                >
                  {saving ? "…" : "Confirmer et modifier"}
                </button>
                )}
              </>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
