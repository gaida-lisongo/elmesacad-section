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

export default function ChargeMatiereClient({ uniteId }: { uniteId: string }) {
  const [ctx, setCtx] = useState<ChargeContext | null>(null);
  const [ctxErr, setCtxErr] = useState<string | null>(null);
  const [charges, setCharges] = useState<unknown[]>([]);
  const [chargesErr, setChargesErr] = useState<string | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [search, setSearch] = useState("");
  const [activeMatiereId, setActiveMatiereId] = useState<string | null>(null);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promoDes, setPromoDes] = useState("");
  const [promoRef, setPromoRef] = useState("");
  const [titulaire, setTitulaire] = useState(emptyTitulaire);
  const [horaire, setHoraire] = useState(emptyHoraire);
  const [status, setStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoadingCtx(true);
    setCtxErr(null);
    try {
      const r = await getUniteChargeContextAction(uniteId);
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
  }, [uniteId]);

  const loadCharges = useCallback(async (sectionId: string) => {
    setLoadingCharges(true);
    setChargesErr(null);
    try {
      const r = await listChargesHorairesAction(sectionId);
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
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (ctx?.sectionId) loadCharges(ctx.sectionId);
  }, [ctx?.sectionId, loadCharges]);

  const activeMatiere = useMemo(
    () => ctx?.matieres.find((m) => m._id === activeMatiereId) ?? null,
    [ctx, activeMatiereId]
  );

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
    setEditingId(null);
    setFormErr(null);
    setPromoDes("");
    setPromoRef("");
    setTitulaire(emptyTitulaire);
    setHoraire(emptyHoraire);
    setStatus(true);
  };

  const openEdit = (c: unknown) => {
    const id = chargeId(c);
    if (!id || !ctx) return;
    const o = c as {
      titulaire?: typeof emptyTitulaire;
      horaire?: typeof emptyHoraire;
      status?: boolean;
      promotion?: { designation?: string; reference?: string };
    };
    setModal("edit");
    setEditingId(id);
    setFormErr(null);
    setPromoDes(o.promotion?.designation ?? "");
    setPromoRef(o.promotion?.reference ?? "");
    setTitulaire({ ...emptyTitulaire, ...o.titulaire });
    setHoraire({ ...emptyHoraire, ...o.horaire });
    setStatus(o.status !== false);
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
        sectionId: ctx.sectionId,
        uniteId: ctx.unite._id,
        matiereId: activeMatiere._id,
        promotion:
          promoDes.trim() || promoRef.trim()
            ? { designation: promoDes.trim(), reference: promoRef.trim() }
            : undefined,
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
      await loadCharges(ctx.sectionId);
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!ctx || !editingId) return;
    setSaving(true);
    setFormErr(null);
    try {
      const r = await updateChargeHoraireAction(ctx.sectionId, editingId, {
        status,
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
        promotion:
          promoDes.trim() || promoRef.trim()
            ? { designation: promoDes.trim(), reference: promoRef.trim() }
            : undefined,
      });
      if (!r.ok) throw new Error(r.message);
      setModal(null);
      await loadCharges(ctx.sectionId);
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
      await loadCharges(ctx.sectionId);
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
              href="/section/dashboard"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
            >
              Dashboard section
            </Link>
            <button
              type="button"
              onClick={openCreate}
              disabled={!activeMatiere}
              className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
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
                          ? "bg-[#082b1c]/10 font-semibold text-[#082b1c] dark:bg-emerald-500/15 dark:text-emerald-200"
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
                    const st =
                      c && typeof c === "object" && (c as { status?: boolean }).status !== false;
                    return (
                      <tr key={id ?? `charge-row-${idx}`}>
                        <td className="px-3 py-2 text-midnight_text dark:text-white">
                          {formatChargeSummary(c)}
                        </td>
                        <td className="px-3 py-2">{st ? "Actif" : "Inactif"}</td>
                        <td className="px-3 py-2 text-right">
                          {id ? (
                            <span className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="text-xs font-medium text-[#082b1c] underline dark:text-[#5ec998]"
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
            {activeMatiere ? (
              <p className="mt-1 text-xs text-gray-500">
                Matière : <strong>{activeMatiere.designation}</strong> ({activeMatiere.code || activeMatiere._id})
              </p>
            ) : null}
            {formErr ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErr}</p>
            ) : null}
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Promotion (optionnel)</p>
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Désignation promotion"
                value={promoDes}
                onChange={(e) => setPromoDes(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Référence promotion"
                value={promoRef}
                onChange={(e) => setPromoRef(e.target.value)}
              />
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Titulaire</p>
              {(["name", "matricule", "email", "telephone", "disponibilite"] as const).map((k) => (
                <input
                  key={k}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder={k}
                  value={titulaire[k]}
                  onChange={(e) => setTitulaire((t) => ({ ...t, [k]: e.target.value }))}
                />
              ))}
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Horaire</p>
              {(["jour", "heure_debut", "heure_fin", "date_debut", "date_fin"] as const).map((k) => (
                <input
                  key={k}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder={k === "date_debut" || k === "date_fin" ? `${k} (ISO optionnel)` : k}
                  value={horaire[k]}
                  onChange={(e) => setHoraire((h) => ({ ...h, [k]: e.target.value }))}
                />
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={status} onChange={(e) => setStatus(e.target.checked)} />
                Actif
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
              <button
                type="button"
                disabled={saving}
                onClick={() => (modal === "create" ? submitCreate() : submitEdit())}
                className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-medium text-white dark:bg-[#5ec998] dark:text-gray-900"
              >
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
