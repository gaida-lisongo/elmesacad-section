"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  createTitulaireActivite,
  listActivitesForCharge,
  uploadTitulaireActiviteResources,
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

type TpDraft = {
  enonce: string;
  sections: Array<{ title: string; contenu: string }>;
};

type QcmDraft = {
  enonce: string;
  options: string[];
  reponse: string;
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function ActiviteCreateCard({
  categorie,
  activeCharge,
}: {
  categorie: ActiviteCategorie;
  activeCharge: ChargeActiviteTab | null;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [dateRemise, setDateRemise] = useState("");
  const [noteMaximale, setNoteMaximale] = useState("20");
  const [montant, setMontant] = useState("0");
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [status, setStatus] = useState("active");
  const [tpDrafts, setTpDrafts] = useState<TpDraft[]>([
    { enonce: "", sections: [{ title: "", contenu: "" }] },
  ]);
  const [qcmDrafts, setQcmDrafts] = useState<QcmDraft[]>([
    { enonce: "", options: ["", ""], reponse: "" },
  ]);

  if (!activeCharge) return <p className="text-sm text-gray-500">Sélectionnez une charge.</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-gray-500">
        Étape {step} sur 2 · {categorie} · <strong>{activeCharge.label}</strong>
      </p>
      <input type="hidden" name="categorie" value={categorie} />
      <input type="hidden" name="charge_id" value={activeCharge.id} />

      {step === 1 ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Date de remise</label>
              <input
                name="date_remise"
                type="datetime-local"
                value={dateRemise ?? ""}
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
                value={noteMaximale ?? ""}
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
                value={montant ?? ""}
                onChange={(e) => setMontant(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Statut</label>
              <input
                name="status"
                value={status ?? ""}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <p className="block text-xs font-medium text-gray-600 dark:text-gray-400">Monnaie</p>
            <div className="mt-2 flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="currency" value="USD" checked={currency === "USD"} onChange={() => setCurrency("USD")} />
                USD
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="currency" value="CDF" checked={currency === "CDF"} onChange={() => setCurrency("CDF")} />
                CDF
              </label>
            </div>
          </div>
          <button
            type="button"
            disabled={!noteMaximale}
            onClick={() => setStep(2)}
            className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
          >
            Suivant : contenu {categorie}
          </button>
        </>
      ) : (
        <>
          {categorie === "TP" ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Ajoutez les questions TP avec sections (`title` + `contenu[]`).</p>
              {tpDrafts.map((tp, i) => (
                <div key={`tp-${i}`} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Énoncé question TP #{i + 1}</label>
                  <textarea
                    value={String(tp.enonce ?? "")}
                    onChange={(e) =>
                      setTpDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, enonce: e.target.value } : x)))
                    }
                    rows={3}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="mt-2 space-y-2">
                    {tp.sections.map((s, j) => (
                      <div key={`tp-${i}-s-${j}`} className="rounded-md border border-gray-100 p-2 dark:border-gray-800">
                        <input
                          value={String(s.title ?? "")}
                          onChange={(e) =>
                            setTpDrafts((prev) =>
                              prev.map((x, idx) =>
                                idx !== i
                                  ? x
                                  : {
                                      ...x,
                                      sections: x.sections.map((sec, k) =>
                                        k === j ? { ...sec, title: e.target.value } : sec
                                      ),
                                    }
                              )
                            )
                          }
                          placeholder="Titre section"
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <textarea
                          value={String(s.contenu ?? "")}
                          onChange={(e) =>
                            setTpDrafts((prev) =>
                              prev.map((x, idx) =>
                                idx !== i
                                  ? x
                                  : {
                                      ...x,
                                      sections: x.sections.map((sec, k) =>
                                        k === j ? { ...sec, contenu: e.target.value } : sec
                                      ),
                                    }
                              )
                            )
                          }
                          rows={3}
                          placeholder="1 ligne = 1 sous-point"
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setTpDrafts((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, sections: [...x.sections, { title: "", contenu: "" }] } : x
                          )
                        )
                      }
                      className="rounded-md border border-[#082b1c] px-2 py-1 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
                    >
                      Ajouter une section
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTpDrafts((prev) => [...prev, { enonce: "", sections: [{ title: "", contenu: "" }] }])}
                className="rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
              >
                Ajouter une question TP
              </button>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Ressources (fichiers)</label>
                <input
                  type="file"
                  name="resources"
                  multiple
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <input type="hidden" name="tp_json" value={JSON.stringify(tpDrafts)} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Créez les questions QCM (énoncé, choix, réponse).</p>
              {qcmDrafts.map((q, i) => (
                <div key={`qcm-${i}`} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Énoncé question #{i + 1}</label>
                  <textarea
                    value={String(q.enonce ?? "")}
                    onChange={(e) =>
                      setQcmDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, enonce: e.target.value } : x)))
                    }
                    rows={2}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                  <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Choix
                  </label>
                  <div className="mt-1 space-y-2">
                    {q.options.map((opt, j) => (
                      <div key={`qcm-${i}-opt-${j}`} className="flex items-center gap-2">
                        <input
                          value={String(opt ?? "")}
                          onChange={(e) =>
                            setQcmDrafts((prev) =>
                              prev.map((x, idx) =>
                                idx !== i
                                  ? x
                                  : {
                                      ...x,
                                      options: x.options.map((o, k) => (k === j ? e.target.value : o)),
                                    }
                              )
                            )
                          }
                          placeholder={`Choix ${j + 1}`}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setQcmDrafts((prev) =>
                              prev.map((x, idx) =>
                                idx !== i ? x : { ...x, options: x.options.filter((_, k) => k !== j) }
                              )
                            )
                          }
                          disabled={q.options.length <= 2}
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setQcmDrafts((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, options: [...x.options, ""] } : x))
                        )
                      }
                      className="rounded-md border border-[#082b1c] px-2 py-1 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
                    >
                      Ajouter un choix
                    </button>
                  </div>
                  <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Réponse correcte</label>
                  <input
                    value={String(q.reponse ?? "")}
                    onChange={(e) =>
                      setQcmDrafts((prev) => prev.map((x, idx) => (idx === i ? { ...x, reponse: e.target.value } : x)))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQcmDrafts((prev) => [...prev, { enonce: "", options: ["", ""], reponse: "" }])}
                className="rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
              >
                Ajouter une question QCM
              </button>
              <input type="hidden" name="qcm_json" value={JSON.stringify(qcmDrafts)} />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              Retour étape 1
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
            >
              Créer activité {categorie}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TitulaireActivitesManagerClient({ categorie, chargeTabs }: Props) {
  const [activeChargeId, setActiveChargeId] = useState(chargeTabs[0]?.id ?? "");
  const [items, setItems] = useState<ActiviteListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSheet, setQrSheet] = useState<QrSheet | null>(null);

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
        CardCreate={() => <ActiviteCreateCard categorie={categorie} activeCharge={activeCharge} />}
        onCreate={async (formData) => {
          const chargeId = String(formData.get("charge_id") ?? "").trim();
          if (!chargeId) {
            setError("Charge horaire introuvable.");
            return;
          }
          const note = Number(formData.get("note_maximale") ?? 0);
          const amount = Number(formData.get("montant") ?? 0);
          const dateRemise = String(formData.get("date_remise") ?? "").trim();
          const status = String(formData.get("status") ?? "active").trim();
          const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
          let qcm: Array<{ enonce: string; options: string[]; reponse: string }> = [];
          let tp: Array<{
            enonce: string;
            description: Array<{ title: string; contenu: string[] }>;
            fichiers: string[];
            status: boolean;
          }> = [];

          if (categorie === "QCM") {
            const raw = String(formData.get("qcm_json") ?? "[]");
            let parsed: QcmDraft[] = [];
            try {
              parsed = JSON.parse(raw) as QcmDraft[];
            } catch {
              parsed = [];
            }
            qcm = parsed
              .map((x) => ({
                enonce: String(x.enonce ?? "").trim(),
                options: (Array.isArray(x.options) ? x.options : []).map((o) => String(o ?? "").trim()).filter(Boolean),
                reponse: String(x.reponse ?? "").trim(),
              }))
              .filter((x) => x.enonce && x.options.length > 0 && x.reponse);
          } else {
            const raw = String(formData.get("tp_json") ?? "[]");
            let parsed: TpDraft[] = [];
            try {
              parsed = JSON.parse(raw) as TpDraft[];
            } catch {
              parsed = [];
            }
            const files = formData
              .getAll("resources")
              .filter((x): x is File => x instanceof File && x.size > 0);
            const uploadedUrls = await uploadTitulaireActiviteResources({
              files,
              chargeId,
              categorie: "TP",
            });
            tp = parsed
              .map((x) => ({
                enonce: String(x.enonce ?? "").trim(),
                description: (Array.isArray(x.sections) ? x.sections : [])
                  .map((s) => ({
                    title: String(s.title ?? "").trim(),
                    contenu: String(s.contenu ?? "")
                      .split(/\r?\n/)
                      .map((c) => c.trim())
                      .filter(Boolean),
                  }))
                  .filter((s) => s.title || s.contenu.length > 0),
                fichiers: uploadedUrls,
                status: true,
              }))
              .filter((x) => x.enonce);
          }

          const r = await createTitulaireActivite({
            chargeId,
            categorie,
            date_remise: dateRemise || undefined,
            status: status || "active",
            note_maximale: note,
            montant: amount,
            currency: currency === "CDF" ? "CDF" : "USD",
            qcm,
            tp,
          });
          if (!r.ok) {
            setError(r.message);
            return;
          }
          setError(null);
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
