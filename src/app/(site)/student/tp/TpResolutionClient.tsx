"use client";

import { useMemo, useState } from "react";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";
import { uploadResolutionFiles } from "@/actions/studentResolutions";

export default function TpResolutionClient({ activiteIdRaw }: { activiteIdRaw: string }) {
  const activiteId = useMemo(() => normalizeMongoObjectIdString(activiteIdRaw), [activiteIdRaw]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matricule, setMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [matiere, setMatiere] = useState("");
  const [reponse, setReponse] = useState("");
  const [tpId, setTpId] = useState("tp-1");
  const [files, setFiles] = useState<File[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activiteId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const filePayload = await uploadResolutionFiles({
        files,
        matricule: matricule.trim(),
        activiteId,
      });
      const payload = {
        email: email.trim(),
        matricule: matricule.trim(),
        matiere: matiere.trim(),
        note: 0,
        activite_id: activiteId,
        reponses_qcm: [],
        reponses_tp: [
          {
            tp_id: tpId.trim() || "tp-1",
            reponse: reponse.trim(),
            fichiers: filePayload,
          },
        ],
      };
      const res = await fetch("/api/resolutions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || body.success === false) throw new Error(body.message ?? "Soumission refusée.");
      setMessage("Résolution TP soumise avec succès.");
    } catch (err) {
      setError((err as Error).message ?? "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Soumission TP</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Joignez votre fichier puis soumettez votre résolution.
      </p>
      <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Activité : <strong>{activiteId ?? "Introuvable"}</strong>
      </p>

      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Matricule</label>
            <input
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Matière</label>
          <input
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
            placeholder="Ex. Algorithmique"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Identifiant item TP</label>
          <input
            value={tpId}
            onChange={(e) => setTpId(e.target.value)}
            placeholder="tp-1"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Réponse textuelle</label>
          <textarea
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Fichier(s) TP</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">{files.length} fichier(s) sélectionné(s)</p>
        </div>
        <button
          type="submit"
          disabled={busy || !activiteId}
          className="w-full rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
        >
          {busy ? "Soumission..." : "Soumettre ma résolution TP"}
        </button>
      </form>
    </section>
  );
}
