'use client';

import { useEffect, useMemo, useState } from "react";
import { EDIT_TAB_UNITE, UniteLite } from "../FiliereStructureClient";
import { cloneDescription, DescriptionBloc, DescriptionBlocsEditor, parseDescriptionForSave } from "@/components/Layout/DescriptionBlocsEditor";
import { creditsMatiereDepasseUnite } from "@/lib/validation/creditsCoherence";
import MatiereEditRow from "./MatiereEditRow";

const EDIT_TAB_COURS = "cours";
const DEFAULT_DESCRIPTION: DescriptionBloc[] = [
    { title: 'Catégorie', contenu: '' },
    { title: 'Objectif', contenu: '' },
    { title: 'Compétences', contenu: '' },
    { title: 'Préalables', contenu: '' },
    { title: 'Méthode d\'enseignement', contenu: '' }
];

const TAB_UNITE = "unite";
const TAB_DESC = "description";
const TAB_COURS = "cours";

type Props = {
    editUe: UniteLite;
    closeEditModal: () => void;
    reload: () => Promise<void>;
    onSaveUe: () => Promise<void>;
}
const UniteEditModal = ({ editUe, closeEditModal, reload, onSaveUe }: Props) => {
    console.log("UniteEditModal: editUe", editUe);
    console.log("UniteEditModal: editUe.description", editUe?.description);
    const [editModalTab, setEditModalTab] = useState<string>(TAB_UNITE);
    const [savingEdit, setSavingEdit] = useState(false);
    const [addingMatiere, setAddingMatiere] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [editDesignation, setEditDesignation] = useState("");
    const [editCredits, setEditCredits] = useState("");
    const [editCode, setEditCode] = useState("");
    const [editDescription, setEditDescription] = useState<DescriptionBloc[]>([
        {
            title: 'Catégorie',
            contenu: editUe?.description?.find(d => d.title === 'Catégorie')?.contenu || ''
        },
        {
            title: 'Objectif',
            contenu: editUe?.description?.find(d => d.title === 'Objectif')?.contenu || ''
        },
        {
            title: 'Compétences',
            contenu: editUe?.description?.find(d => d.title === 'Compétences')?.contenu || ''
        },
        {
            title: 'Préalables',
            contenu: editUe?.description?.find(d => d.title === 'Préalables')?.contenu || ''
        },
        {
            title: 'Méthode d\'enseignement',
            contenu: editUe?.description?.find(d => d.title === 'Méthode d\'enseignement')?.contenu || ''
        }
    ]);
    const [newMatiereDesignation, setNewMatiereDesignation] = useState("");
    const [newMatiereCredits, setNewMatiereCredits] = useState("");
    const [newMatiereCode, setNewMatiereCode] = useState("");
    const [newMatiereDescription, setNewMatiereDescription] = useState<DescriptionBloc[]>([]);
    
    const sommeCreditsMatiereEditUe = useMemo(() => {
        if (!editUe) return 0;
        return (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
    }, [editUe]);

    // Cette fonction fusionne le template obligatoire avec les données existantes
    const getInitialDescription = (existing?: DescriptionBloc[]): DescriptionBloc[] => {
        if (!existing || existing.length === 0) return cloneDescription(DEFAULT_DESCRIPTION);
        
        // On s'assure que chaque titre du template est présent
        const merged = cloneDescription(DEFAULT_DESCRIPTION).map(templateBloc => {
            const found = existing.find(eb => eb.title === templateBloc.title);
            return found ? found : templateBloc;
        });

        // On ajoute les éventuels blocs personnalisés qui ne sont pas dans le template
        const customBlocs = existing.filter(eb => !DEFAULT_DESCRIPTION.some(db => db.title === eb.title));
        
        return [...merged, ...customBlocs];
    };

    const onCloseEditModal = () => {
        closeEditModal();
        setEditModalTab(EDIT_TAB_UNITE);
        setEditDesignation("");
        setEditCredits("");
        setEditCode("");
        setEditDescription([]);
        setNewMatiereDesignation("");
    };

    const submitAddMatiere = async () => {
        if (!editUe) return;
        const des = newMatiereDesignation.trim();
        const c = Number.parseFloat(newMatiereCredits.replace(",", "."));
        const cd = newMatiereCode.trim();
        if (!des) {
            setErr("Désignation du cours requise.");
            return;
        }
        if (!Number.isFinite(c) || c < 0) {
            setErr("Crédits du cours invalides.");
            return;
        }
        const actuel = (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
        if (creditsMatiereDepasseUnite(editUe.credits, actuel + c)) {
            setErr(
                `Ajout impossible : ${actuel + c} cr. (matières) pour une unité à ${editUe.credits} cr. Réduisez les crédits ou augmentez l’unité (onglet Unité).`
            );
            return;
        }
        const newDesc = parseDescriptionForSave(newMatiereDescription);
        if (!newDesc.ok) {
            setErr(newDesc.message);
            return;
        }
        setAddingMatiere(true);
        setErr(null);
        try {
            const res = await fetch(`/api/unites/${editUe._id}/matieres`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    designation: des,
                    credits: c,
                    code: cd || undefined,
                    description: newDesc.value,
                }),
            });
            const j = (await res.json()) as { message?: string };
            if (!res.ok) throw new Error(j.message || "Création impossible");
            setNewMatiereDesignation("");
            setNewMatiereCredits("");
            setNewMatiereCode("");
            setNewMatiereDescription([]);
            await reload();
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setAddingMatiere(false);
        }
    }

    const handleEditPresentation = async () => {
      try {
        if(!editUe) return;
        const payload = {
          designation: editDesignation.trim(),
          code: editCode.trim().toUpperCase(),
          credits: Number.parseFloat(editCredits.replace(",", "."))
        }

        if(!payload.designation || !payload.code) {
          setErr("Désignation et code requis.");
          return;
        }

        if (!Number.isFinite(payload.credits) || payload.credits < 0) {
          setErr("Crédits invalides.");
          return;
        }

        const sommeMat = (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
        if (creditsMatiereDepasseUnite(payload.credits, sommeMat)) {
          setErr(
            `Les matières totalisent ${sommeMat} cr. : impossible de fixer l’unité à ${payload.credits} cr. Réduisez d’abord les cours ou leurs crédits.`
          );
          return;
        }
        setSavingEdit(true);
        setErr(null);

        const res = await fetch(`/api/unites/${editUe._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const j = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(j.message || "Mise à jour impossible");
        closeEditModal();
        await onSaveUe();
        
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Une erreur est survenue";
        setErr(errMsg);        
      } finally {
        setSavingEdit(false);
      }
    }

    const handleEditDescription = async () => {
        if (!editUe) return;
        try {
          const descParsed = parseDescriptionForSave(editDescription);
          if (!descParsed.ok) {
            setErr(descParsed.message);
            return;
          }

          setSavingEdit(true);
          setErr(null);

          const res = await fetch(`/api/unites/${editUe._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: descParsed.value }),
          });

          const j = (await res.json()) as { message?: string };
          if (!res.ok) throw new Error(j.message || "Mise à jour impossible");
          closeEditModal();
          await onSaveUe();
          
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Une erreur est survenue";
          setErr(errMsg);
        } finally {
          setSavingEdit(false);
        }
    }

    const submitEditUe = async () => {
        if (!editUe) return;
        const des = editDesignation.trim();
        const cd = editCode.trim().toUpperCase();
        const c = Number.parseFloat(editCredits.replace(",", "."));
        if (!des || !cd) {
            setErr("Désignation et code requis.");
            return;
        }
        if (!Number.isFinite(c) || c < 0) {
            setErr("Crédits invalides.");
            return;
        }
        const sommeMat = (editUe.matieres ?? []).reduce((s, m) => s + (Number(m.credits) || 0), 0);
        if (creditsMatiereDepasseUnite(c, sommeMat)) {
            setErr(
                `Les matières totalisent ${sommeMat} cr. : impossible de fixer l’unité à ${c} cr. Réduisez d’abord les cours ou leurs crédits.`
            );
            return;
        }
        const descParsed = parseDescriptionForSave(editDescription);
        if (!descParsed.ok) {
            setErr(descParsed.message);
            return;
        }
        setSavingEdit(true);
        setErr(null);
        try {
            const res = await fetch(`/api/unites/${editUe._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ designation: des, code: cd, credits: c, description: descParsed.value }),
            });
            const j = (await res.json()) as { message?: string };
            if (!res.ok) throw new Error(j.message || "Mise à jour impossible");
            closeEditModal();
            await onSaveUe();
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setSavingEdit(false);
        }
    }


    useEffect(() => {
        if (!editUe) return;
        setEditDesignation(editUe.designation);
        setEditCredits(editUe.credits.toString());
        setEditCode(editUe.code);
        setEditDescription(getInitialDescription(editUe.description));
        setNewMatiereDesignation("");
        setNewMatiereCredits("");
        setNewMatiereCode("");
    }, [editUe])

    return (
        
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex h-[720px] w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white">Modifier l’unité</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {editUe.code} · {editUe.designation}
              </p>
              {/* <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalTab(EDIT_TAB_UNITE);
                    setErr(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    editModalTab === EDIT_TAB_UNITE
                      ? "bg-primary text-white dark:bg-primary dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  Unité d’enseignement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditModalTab(EDIT_TAB_COURS);
                    setErr(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    editModalTab === EDIT_TAB_COURS
                      ? "bg-primary text-white dark:bg-primary dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  Cours (matières)
                </button>
              </div> */}
              <div className="mt-4 flex flex-wrap gap-2">
                    {[
                        { id: TAB_UNITE, label: "Présentation" },
                        { id: TAB_DESC, label: "Description détaillée" },
                        { id: TAB_COURS, label: "Eléments constitutifs" }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setEditModalTab(tab.id); setErr(null); }}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                                editModalTab === tab.id
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                
              </div>
            </div>

            {err ? (
              <div className="shrink-0 border-b border-red-100 bg-red-50/80 px-5 py-2 dark:border-red-900/30 dark:bg-red-950/20">
                <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                  {err}
                </p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
            {editModalTab === TAB_UNITE && (
              <>
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Désignation
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Code
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Crédits
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editCredits}
                      onChange={(e) => setEditCredits(e.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => void handleEditPresentation()}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white dark:bg-primary dark:text-gray-900"
                  >
                    {savingEdit ? "…" : "Enregistrer l’unité"}
                  </button>
                  <button
                    type="button"
                    onClick={onCloseEditModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}

            {/* ONGLET 2 : DESCRIPTION (Le template obligatoire) */}
            {editModalTab === TAB_DESC && (
                <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        <strong>Note :</strong> Les sections "Objectifs", "Compétences", etc. sont obligatoires pour la fiche programme.
                    </div>
                    <DescriptionBlocsEditor
                        label="Fiche descriptive"
                        items={editDescription}
                        onChange={setEditDescription}
                    />
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={
                            () => void handleEditDescription()
                        } disabled={savingEdit} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white dark:bg-primary dark:text-gray-900">
                            {savingEdit ? "…" : "Mettre à jour la description"}
                        </button>
                        <button
                            type="button"
                            onClick={onCloseEditModal}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {editModalTab === TAB_COURS && (
              <>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Modifiez les cours rattachés à cette unité. Chaque ligne s’enregistre indépendamment. La somme des
                  crédits des matières ne peut pas dépasser le plafond de l’unité.
                </p>
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    creditsMatiereDepasseUnite(editUe.credits, sommeCreditsMatiereEditUe)
                      ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
                      : "bg-gray-50 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                  }`}
                >
                  Plafond UE : <span className="font-semibold">{editUe.credits} cr.</span> · Matières :{" "}
                  <span className="font-semibold">{sommeCreditsMatiereEditUe} cr.</span>
                  {!creditsMatiereDepasseUnite(editUe.credits, sommeCreditsMatiereEditUe) ? (
                    <>
                      {" "}
                      · Reste :{" "}
                      <span className="font-semibold">
                        {Math.round((editUe.credits - sommeCreditsMatiereEditUe) * 1000) / 1000} cr.
                      </span>
                    </>
                  ) : (
                    <span className="font-medium"> — dépassement : corrigez les cours ou augmentez l’unité.</span>
                  )}
                </p>
                {(editUe.matieres ?? []).length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Aucun cours pour l’instant.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {(editUe.matieres ?? []).map((m) => (
                      <MatiereEditRow
                        key={m._id}
                        matiere={m}
                        uniteId={editUe._id}
                        creditsPlafondUnite={editUe.credits}
                        creditsAutresMatieres={(editUe.matieres ?? [])
                          .filter((x) => x._id !== m._id)
                          .reduce((s, x) => s + (Number(x.credits) || 0), 0)}
                        onAfterChange={reload}
                      />
                    ))}
                  </ul>
                )}

                <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-semibold text-midnight_text dark:text-white">Ajouter un cours</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">
                      Désignation
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newMatiereDesignation}
                        onChange={(e) => setNewMatiereDesignation(e.target.value)}
                        placeholder="ex. Introduction…"
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Crédits
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newMatiereCredits}
                        onChange={(e) => setNewMatiereCredits(e.target.value)}
                        placeholder="3"
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Code (optionnel)
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={newMatiereCode}
                        onChange={(e) => setNewMatiereCode(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                    <DescriptionBlocsEditor
                      label="Description du nouveau cours"
                      items={newMatiereDescription}
                      onChange={setNewMatiereDescription}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addingMatiere}
                    onClick={() => void submitAddMatiere()}
                    className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white dark:bg-primary dark:text-gray-900"
                  >
                    {addingMatiere ? "…" : "Ajouter le cours"}
                  </button>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={onCloseEditModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
    );
};

export default UniteEditModal;