"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";

type ApiResult = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export default function PresenceDeclarationClient() {
  const searchParams = useSearchParams();
  const seanceRefRaw = useMemo(() => String(searchParams.get("seanceRef") ?? "").trim(), [searchParams]);
  const seanceRef = useMemo(() => normalizeMongoObjectIdString(seanceRefRaw), [seanceRefRaw]);

  const [matricule, setMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function askLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas supportée sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => {
        setError(`Impossible d'obtenir la localisation (${err.message}).`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (!seanceRef) {
        throw new Error(
          seanceRefRaw
            ? "QR code ou lien invalide : identifiant de séance incorrect (24 caractères hex attendus)."
            : "QR code invalide : seanceRef manquant."
        );
      }
      if (lat == null || lng == null) {
        throw new Error("Activez la localisation avant de valider.");
      }
      const res = await fetch("/api/presences/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: matricule.trim(),
          email: email.trim(),
          seanceRef,
          latitude: lat,
          longitude: lng,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as ApiResult;
      if (!res.ok || payload.success === false) {
        throw new Error(payload.message ?? "Déclaration de présence refusée.");
      }
      setMessage(payload.message ?? "Présence enregistrée.");
    } catch (err) {
      setError((err as Error).message ?? "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Validation de présence</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Renseignez vos informations puis activez votre localisation pour valider le scan.
      </p>
      <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Séance :{" "}
        <strong>
          {seanceRef ?? (seanceRefRaw ? `(référence invalide : ${seanceRefRaw.slice(0, 40)})` : "Introuvable")}
        </strong>
      </p>

      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
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
        <div className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <button
            type="button"
            onClick={askLocation}
            className="rounded-md border border-[#082b1c] px-3 py-2 text-xs font-semibold text-[#082b1c] dark:border-[#5ec998] dark:text-[#5ec998]"
          >
            Activer ma localisation
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Latitude: {lat ?? "—"} · Longitude: {lng ?? "—"}
          </p>
        </div>
        <button
          type="submit"
          disabled={busy || !seanceRef}
          className="w-full rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
        >
          {busy ? "Validation..." : "Déclarer ma présence"}
        </button>
      </form>
    </section>
  );
}

