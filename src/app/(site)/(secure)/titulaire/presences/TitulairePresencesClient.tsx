"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  createTitulaireSeance,
  listSeancesForCharge,
  type ChargePresenceTab,
  type SeanceListItem,
} from "@/actions/titulairePresences";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";

type Props = {
  chargeTabs: ChargePresenceTab[];
};
type SeanceDescriptionSection = { title: string; contenu: string };
type QrSheet = {
  url: string;
  item: SeanceListItem;
  chargeLabel: string;
};

function formatSeanceDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function TitulairePresencesClient({ chargeTabs }: Props) {
  const [activeChargeId, setActiveChargeId] = useState(chargeTabs[0]?.id ?? "");
  const [seances, setSeances] = useState<SeanceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSheet, setQrSheet] = useState<QrSheet | null>(null);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [lecon, setLecon] = useState("");
  const [jour, setJour] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [dateSeance, setDateSeance] = useState("");
  const [salle, setSalle] = useState("");
  const [descriptionSections, setDescriptionSections] = useState<SeanceDescriptionSection[]>([
    { title: "", contenu: "" },
  ]);

  const activeCharge = useMemo(
    () => chargeTabs.find((c) => c.id === activeChargeId) ?? null,
    [chargeTabs, activeChargeId]
  );

  const loadSeances = useCallback(async () => {
    if (!activeChargeId) {
      setSeances([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listSeancesForCharge(activeChargeId);
      // Visible dans la console du navigateur (F12). L’URL exacte est loggée côté serveur (terminal `next dev`).
      console.log("[titulaire-presences UI] séances reçues", {
        chargeId: activeChargeId,
        count: list.length,
        ids: list.map((s) => s.id),
      });
      setSeances(list);
    } catch (e) {
      console.error("[titulaire-presences UI] erreur chargement séances", activeChargeId, e);
      setError((e as Error).message ?? "Impossible de charger les séances.");
      setSeances([]);
    } finally {
      setLoading(false);
    }
  }, [activeChargeId]);

  useEffect(() => {
    void loadSeances();
  }, [loadSeances]);

  const CardCreate = () => {
    if (!activeCharge) {
      return <p className="text-sm text-gray-500">Sélectionnez une charge.</p>;
    }
    return (
      <div className="space-y-3">
        <input type="hidden" name="chargeId" value={activeCharge.id} />
        <p className="text-xs font-medium text-gray-500">Étape {createStep} sur 2</p>

        {createStep === 1 ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Leçon</label>
              <input
                name="lecon"
                required
                value={lecon}
                onChange={(e) => setLecon(e.target.value)}
                placeholder="Ex. Chapitre 2 — Arbres binaires"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Jour</label>
                <input
                  name="jour"
                  required
                  value={jour}
                  onChange={(e) => setJour(e.target.value)}
                  placeholder="Lundi"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Heure début</label>
                <input
                  name="heure_debut"
                  type="time"
                  required
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Heure fin</label>
                <input
                  name="heure_fin"
                  type="time"
                  required
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input
                name="date"
                type="date"
                required
                value={dateSeance}
                onChange={(e) => setDateSeance(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Salle</label>
              <input
                name="salle"
                required
                value={salle}
                onChange={(e) => setSalle(e.target.value)}
                placeholder="Ex. B12"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              disabled={!lecon.trim() || !jour.trim() || !heureDebut || !heureFin || !dateSeance || !salle.trim()}
              onClick={() => setCreateStep(2)}
              className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
            >
              Suivant : Description
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="lecon" value={lecon} />
            <input type="hidden" name="jour" value={jour} />
            <input type="hidden" name="heure_debut" value={heureDebut} />
            <input type="hidden" name="heure_fin" value={heureFin} />
            <input type="hidden" name="date" value={dateSeance} />
            <input type="hidden" name="salle" value={salle} />
            <input
              type="hidden"
              name="descriptionJson"
              value={JSON.stringify(
                descriptionSections
                  .map((s) => ({
                    title: s.title.trim(),
                    contenu: s.contenu
                      .split(/\r?\n/)
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                  .filter((s) => s.title || s.contenu.length > 0)
              )}
            />
            <p className="text-xs text-gray-500">
              Décrivez la séance en sections (titre + lignes de contenu).
            </p>
            {descriptionSections.map((section, idx) => (
              <div key={`desc-${idx}`} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Titre section</label>
                <input
                  value={section.title}
                  onChange={(e) =>
                    setDescriptionSections((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                    )
                  }
                  placeholder="Ex. Objectifs de la séance"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Contenu (1 ligne = 1 point)
                </label>
                <textarea
                  value={section.contenu}
                  onChange={(e) =>
                    setDescriptionSections((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, contenu: e.target.value } : s))
                    )
                  }
                  rows={4}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDescriptionSections((prev) => [...prev, { title: "", contenu: "" }])}
                className="rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
              >
                Ajouter une section
              </button>
              <button
                type="button"
                onClick={() => setCreateStep(1)}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                Retour infos
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
              >
                Valider la création
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (chargeTabs.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Présences</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Aucune charge horaire trouvée pour votre compte. Vérifiez le service titulaire et vos affectations.
        </p>
      </section>
    );
  }

  return (
    <>
      {error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <PageManager<SeanceListItem>
        title="Présences"
        description="Par charge horaire, créez des séances puis saisissez les présences pour chaque séance."
        items={seances}
        tabs={chargeTabs.map((c) => ({ value: c.id, label: c.label }))}
        activeTab={activeChargeId}
        onTabChange={setActiveChargeId}
        searchPlaceholder="Rechercher une séance (libellé, année)…"
        listLayout="grid-3"
        showCreateButton
        CardCreate={CardCreate}
        onCreate={async (formData) => {
          if (!activeCharge) return;
          const descriptionRaw = String(formData.get("descriptionJson") ?? "[]");
          let description: Array<{ title: string; contenu: string[] }> = [];
          try {
            description = JSON.parse(descriptionRaw) as Array<{ title: string; contenu: string[] }>;
          } catch {
            description = [];
          }
          const r = await createTitulaireSeance({
            chargeId: activeCharge.id,
            jour: String(formData.get("jour") ?? "").trim(),
            heure_debut: String(formData.get("heure_debut") ?? "").trim(),
            heure_fin: String(formData.get("heure_fin") ?? "").trim(),
            date: String(formData.get("date") ?? "").trim(),
            salle: String(formData.get("salle") ?? "").trim(),
            lecon: String(formData.get("lecon") ?? "").trim(),
            description,
            status: true,
          });
          if (!r.ok) {
            setError(r.message);
            return;
          }
          setError(null);
          setCreateStep(1);
          setLecon("");
          setJour("");
          setHeureDebut("");
          setHeureFin("");
          setDateSeance("");
          setSalle("");
          setDescriptionSections([{ title: "", contenu: "" }]);
          await loadSeances();
        }}
        CardItem={({ item }) => (
          <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
            <p className="text-sm font-semibold text-midnight_text dark:text-white">{item.label}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatSeanceDate(item.dateSeance)}</p>
            <p className="mt-1 text-xs text-gray-400">
              {item.jour} · {item.heureDebut} - {item.heureFin}
            </p>
            <p className="mt-1 text-xs text-gray-400">Salle : {item.salle || "—"}</p>
            <div className="mt-auto pt-4">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={{
                    pathname: `/titulaire/presences/${encodeURIComponent(item.id)}`,
                    query: {
                      label: item.label,
                      date: item.dateSeance,
                      jour: item.jour,
                      heureDebut: item.heureDebut,
                      heureFin: item.heureFin,
                      salle: item.salle,
                    },
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex rounded-md bg-[#082b1c] px-3 py-2 text-xs font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
                >
                  Feuille de présences
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const oid = normalizeMongoObjectIdString(item.id);
                    if (!oid) {
                      setError("Identifiant de séance invalide : impossible de générer le QR.");
                      return;
                    }
                    setError(null);
                    const origin = window.location.origin;
                    const url = `${origin}/presence?seanceRef=${encodeURIComponent(oid)}`;
                    setQrSheet({
                      url,
                      item,
                      chargeLabel: activeCharge?.label ?? "",
                    });
                  }}
                  className="inline-flex rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
                >
                  Générer QR
                </button>
              </div>
            </div>
          </div>
        )}
      />
      {loading ? (
        <p className="mt-2 text-center text-xs text-gray-500">Chargement des séances…</p>
      ) : null}
      {qrSheet ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-midnight_text dark:text-white">Fiche de séance + QR Code</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">À afficher en classe pour le scan étudiant.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
              <div className="space-y-1 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
                <p>
                  <strong>Charge :</strong> {qrSheet.chargeLabel || "—"}
                </p>
                <p>
                  <strong>Leçon :</strong> {qrSheet.item.label}
                </p>
                <p>
                  <strong>Date :</strong> {formatSeanceDate(qrSheet.item.dateSeance)}
                </p>
                <p>
                  <strong>Horaire :</strong> {qrSheet.item.jour} · {qrSheet.item.heureDebut} - {qrSheet.item.heureFin}
                </p>
                <p>
                  <strong>Salle :</strong> {qrSheet.item.salle || "—"}
                </p>
                <p className="pt-2 text-xs text-gray-500">L'étudiant doit activer la localisation et saisir matricule + email.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="mt-1 flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrSheet.url)}`}
                    alt="QR Code présence"
                    className="h-[260px] w-[260px] rounded-md border border-gray-200 bg-white p-1"
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 break-all rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {qrSheet.url}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
              >
                Imprimer la fiche
              </button>
              <button
                type="button"
                onClick={() => setQrSheet(null)}
                className="rounded-md bg-[#082b1c] px-3 py-2 text-xs font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
