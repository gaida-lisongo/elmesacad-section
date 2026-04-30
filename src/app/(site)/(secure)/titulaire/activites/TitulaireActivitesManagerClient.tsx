"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  createTitulaireActivite,
  listActivitesForCharge,
  type ActiviteCategorie,
  type ActiviteListItem,
  type ChargeActiviteTab,
} from "@/actions/titulaireActivites";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";

type Props = {
  categorie: ActiviteCategorie;
  chargeTabs: ChargeActiviteTab[];
};

type QrSheet = {
  url: string;
  item: ActiviteListItem;
  chargeLabel: string;
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function TitulaireActivitesManagerClient({ categorie, chargeTabs }: Props) {
  const [activeChargeId, setActiveChargeId] = useState(chargeTabs[0]?.id ?? "");
  const [items, setItems] = useState<ActiviteListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSheet, setQrSheet] = useState<QrSheet | null>(null);
  const [noteMaximale, setNoteMaximale] = useState("20");
  const [dateRemise, setDateRemise] = useState("");
  const [montant, setMontant] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState("active");
  const [enonce, setEnonce] = useState("");
  const [optionsRaw, setOptionsRaw] = useState("");
  const [reponseQcm, setReponseQcm] = useState("");
  const [tpDescription, setTpDescription] = useState("");

  const activeCharge = useMemo(
    () => chargeTabs.find((c) => c.id === activeChargeId) ?? null,
    [activeChargeId, chargeTabs]
  );

  const loadItems = useCallback(async () => {
    if (!activeChargeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listActivitesForCharge(activeChargeId, categorie);
      setItems(rows);
    } catch (e) {
      setItems([]);
      setError((e as Error).message ?? "Impossible de charger les activités.");
    } finally {
      setLoading(false);
    }
  }, [activeChargeId, categorie]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const CardCreate = () => {
    if (!activeCharge) return <p className="text-sm text-gray-500">Sélectionnez une charge.</p>;
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-500">
          Nouvelle activité {categorie} pour : <strong>{activeCharge.label}</strong>
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Date de remise</label>
            <input
              name="date_remise"
              type="datetime-local"
              value={dateRemise}
              onChange={(e) => setDateRemise(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Note maximale</label>
            <input
              name="note_maximale"
              type="number"
              min={1}
              required
              value={noteMaximale}
              onChange={(e) => setNoteMaximale(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Montant</label>
            <input
              name="montant"
              type="number"
              min={0}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Devise</label>
            <input
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Statut</label>
          <input
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Énoncé principal</label>
          <textarea
            value={enonce}
            onChange={(e) => setEnonce(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        {categorie === "QCM" ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Options (1 ligne = 1 option)
              </label>
              <textarea
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Bonne réponse</label>
              <input
                value={reponseQcm}
                onChange={(e) => setReponseQcm(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Description TP (1 ligne = 1 point)
            </label>
            <textarea
              value={tpDescription}
              onChange={(e) => setTpDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={!enonce.trim() || !noteMaximale}
          className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
        >
          Créer activité {categorie}
        </button>
      </div>
    );
  };

  if (chargeTabs.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Activités {categorie}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Aucune charge horaire trouvée pour votre compte.
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
      <PageManager<ActiviteListItem>
        title={`Activités ${categorie}`}
        description="Par charge horaire, créez une activité, générez la fiche de travail (QR) et consultez les résolutions."
        items={items}
        tabs={chargeTabs.map((c) => ({ value: c.id, label: c.label }))}
        activeTab={activeChargeId}
        onTabChange={setActiveChargeId}
        searchPlaceholder={`Rechercher une activité ${categorie.toLowerCase()}…`}
        listLayout="grid-3"
        showCreateButton
        CardCreate={CardCreate}
        onCreate={async () => {
          if (!activeCharge) return;
          const note = Number(noteMaximale || 0);
          const amount = Number(montant || 0);
          const qcm =
            categorie === "QCM"
              ? [
                  {
                    enonce: enonce.trim(),
                    options: optionsRaw
                      .split(/\r?\n/)
                      .map((x) => x.trim())
                      .filter(Boolean),
                    reponse: reponseQcm.trim(),
                  },
                ]
              : [];
          const tp =
            categorie === "TP"
              ? [
                  {
                    enonce: enonce.trim(),
                    description: [
                      {
                        title: "Consignes",
                        contenu: tpDescription
                          .split(/\r?\n/)
                          .map((x) => x.trim())
                          .filter(Boolean),
                      },
                    ],
                    fichiers: [],
                    status: true,
                  },
                ]
              : [];

          const r = await createTitulaireActivite({
            chargeId: activeCharge.id,
            categorie,
            date_remise: dateRemise || undefined,
            status: status || "active",
            note_maximale: note,
            montant: amount,
            currency: currency || "USD",
            qcm,
            tp,
          });
          if (!r.ok) {
            setError(r.message);
            return;
          }
          setError(null);
          setEnonce("");
          setOptionsRaw("");
          setReponseQcm("");
          setTpDescription("");
          setDateRemise("");
          setMontant("0");
          setCurrency("USD");
          setStatus("active");
          await loadItems();
        }}
        CardItem={({ item }) => (
          <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.categorie} · statut: <strong>{item.status || "—"}</strong>
            </p>
            <p className="mt-1 text-sm font-semibold text-midnight_text dark:text-white">
              Remise: {formatDate(item.dateRemise)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Note max: {item.noteMaximale || 0} · Montant: {item.montant || 0} {item.currency || "USD"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {item.categorie === "QCM" ? `${item.qcmCount} question(s)` : `${item.tpCount} point(s) TP`}
            </p>
            <div className="mt-auto pt-4">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/titulaire/activites/${encodeURIComponent(item.id)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex rounded-md bg-[#082b1c] px-3 py-2 text-xs font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
                >
                  Voir résolutions
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const oid = normalizeMongoObjectIdString(item.id);
                    if (!oid) {
                      setError("Identifiant d'activité invalide : impossible de générer le QR.");
                      return;
                    }
                    setError(null);
                    const origin = window.location.origin;
                    const url = `${origin}/student/${categorie.toLowerCase()}?activiteId=${encodeURIComponent(oid)}`;
                    setQrSheet({
                      item,
                      url,
                      chargeLabel: activeCharge?.label ?? "",
                    });
                  }}
                  className="inline-flex rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
                >
                  Fiche travail + QR
                </button>
              </div>
            </div>
          </div>
        )}
      />
      {loading ? <p className="mt-2 text-center text-xs text-gray-500">Chargement des activités…</p> : null}
      {qrSheet ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-midnight_text dark:text-white">Fiche de travail + QR Code</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">À partager pour la soumission de résolution.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
              <div className="space-y-1 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
                <p>
                  <strong>Charge :</strong> {qrSheet.chargeLabel || "—"}
                </p>
                <p>
                  <strong>Catégorie :</strong> {qrSheet.item.categorie}
                </p>
                <p>
                  <strong>Date remise :</strong> {formatDate(qrSheet.item.dateRemise)}
                </p>
                <p>
                  <strong>Note maximale :</strong> {qrSheet.item.noteMaximale || 0}
                </p>
              </div>
              <div className="flex flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrSheet.url)}`}
                  alt="QR Code activité"
                  className="h-[260px] w-[260px] rounded-md border border-gray-200 bg-white p-1"
                />
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
