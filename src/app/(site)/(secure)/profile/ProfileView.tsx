"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { useAuthStore } from "@/stores/authStore";

type ProfileApi = {
  _id: string;
  name: string;
  email: string;
  matricule: string;
  sexe: "M" | "F";
  dateDeNaissance: string;
  lieuDeNaissance: string;
  nationalite: string;
  ville: string;
  adresse: string;
  telephone: string;
  photo: string;
  cycle?: string;
  role?: string;
  diplome?: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-midnight_text dark:border-gray-600 dark:bg-gray-800 dark:text-white";

const labelClass = "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300";

type TabKey = "identite" | "infos";

export function ProfileView() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<TabKey>("identite");
  const [canEditSensitive, setCanEditSensitive] = useState(false);
  const [profile, setProfile] = useState<ProfileApi | null>(null);

  const [name, setName] = useState("");
  const [sexe, setSexe] = useState<"M" | "F">("M");
  const [dateDeNaissance, setDateDeNaissance] = useState("");
  const [lieuDeNaissance, setLieuDeNaissance] = useState("");
  const [nationalite, setNationalite] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [matricule, setMatricule] = useState("");
  const [photo, setPhoto] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/profile", { credentials: "include" });
      if (!r.ok) {
        throw new Error("Chargement impossible");
      }
      const j = (await r.json()) as { profile: ProfileApi; canEditSensitive: boolean };
      const p = j.profile;
      setCanEditSensitive(j.canEditSensitive);
      setProfile(p);
      setName(p.name);
      setSexe(p.sexe);
      setDateDeNaissance(p.dateDeNaissance ? p.dateDeNaissance.slice(0, 10) : "");
      setLieuDeNaissance(p.lieuDeNaissance);
      setNationalite(p.nationalite);
      setVille(p.ville);
      setAdresse(p.adresse);
      setTelephone(p.telephone);
      setEmail(p.email);
      setMatricule(p.matricule);
      setPhoto(p.photo);
    } catch {
      toast.error("Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHydrated && user) {
      void load();
    }
  }, [isHydrated, user, load]);

  const saveIdentite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          sexe,
          dateDeNaissance: dateDeNaissance ? new Date(dateDeNaissance).toISOString() : undefined,
          lieuDeNaissance,
          nationalite,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "Erreur");
      }
      toast.success("Identité enregistrée.");
      await hydrate();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    } finally {
      setSaving(false);
    }
  };

  const saveInfos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {
        ville,
        adresse,
        telephone,
      };
      if (canEditSensitive) {
        body.email = email;
        body.matricule = matricule;
      }
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "Erreur");
      }
      toast.success("Informations enregistrées.");
      await hydrate();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const r = await fetch("/api/profile/photo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { photo?: string; message?: string };
      if (!r.ok) {
        throw new Error(j.message ?? "Upload impossible");
      }
      if (j.photo) {
        setPhoto(j.photo);
      }
      toast.success("Photo mise à jour.");
      await hydrate();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload impossible");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#082b1c] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="mb-2">Session non chargée.</p>
        <Link href="/signin" className="font-medium underline">
          Se connecter
        </Link>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#082b1c] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <div className="relative h-28 w-28 overflow-hidden rounded-2xl ring-4 ring-[#082b1c]/20">
            <Image src={photo || "/images/user.jpg"} alt="" width={112} height={112} className="h-28 w-28 object-cover" />
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 text-xs font-medium text-[#082b1c] hover:underline dark:text-emerald-400">
            <Icon icon="solar:camera-bold" className="h-4 w-4" />
            {uploading ? "Envoi…" : "Changer la photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPhoto} disabled={uploading} />
          </label>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#082b1c]">{user.accountLabel}</p>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{name || profile.name}</h1>
          <div className="mt-3 space-y-1 text-left text-sm">
            <p className="flex flex-wrap gap-2">
              <span className="text-gray-500">E-mail</span>
              <span className="font-medium text-midnight_text dark:text-white">{email}</span>
              {!canEditSensitive && (
                <span className="rounded bg-gray-100 px-1.5 text-[10px] text-gray-600 dark:bg-gray-800">lecture seule</span>
              )}
            </p>
            <p className="flex flex-wrap gap-2">
              <span className="text-gray-500">Matricule</span>
              <span className="font-mono font-medium text-midnight_text dark:text-white">{matricule}</span>
              {!canEditSensitive && (
                <span className="rounded bg-gray-100 px-1.5 text-[10px] text-gray-600 dark:bg-gray-800">lecture seule</span>
              )}
            </p>
            {profile.cycle && (
              <p className="text-gray-500">
                Cycle : <span className="font-medium text-midnight_text dark:text-white">{profile.cycle}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex rounded-xl bg-gray-100/80 p-1 dark:bg-gray-800/80">
        {(
          [
            { id: "identite" as const, label: "Identité" },
            { id: "infos" as const, label: "Informations" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-white text-[#082b1c] shadow dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "identite" && (
        <form onSubmit={saveIdentite} className="space-y-4 rounded-2xl border border-gray-200/90 bg-white p-5 dark:border-gray-600 dark:bg-gray-900/50">
          <div>
            <label className={labelClass}>Nom</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Sexe</label>
            <select className={inputClass} value={sexe} onChange={(e) => setSexe(e.target.value as "M" | "F")}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date de naissance</label>
            <input
              type="date"
              className={inputClass}
              value={dateDeNaissance}
              onChange={(e) => setDateDeNaissance(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Lieu de naissance</label>
            <input className={inputClass} value={lieuDeNaissance} onChange={(e) => setLieuDeNaissance(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Nationalité</label>
            <input className={inputClass} value={nationalite} onChange={(e) => setNationalite(e.target.value)} required />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#082b1c] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer l’identité"}
          </button>
        </form>
      )}

      {tab === "infos" && (
        <form onSubmit={saveInfos} className="space-y-4 rounded-2xl border border-gray-200/90 bg-white p-5 dark:border-gray-600 dark:bg-gray-900/50">
          <div>
            <label className={labelClass}>Ville</label>
            <input className={inputClass} value={ville} onChange={(e) => setVille(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Adresse</label>
            <textarea
              className={inputClass + " min-h-[88px]"}
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
          </div>

          {canEditSensitive && (
            <>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Vous êtes administrateur : vous pouvez modifier l’e-mail et le matricule.
              </p>
              <div>
                <label className={labelClass}>E-mail</label>
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Matricule</label>
                <input className={inputClass} value={matricule} onChange={(e) => setMatricule(e.target.value)} required />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#082b1c] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer les informations"}
          </button>
        </form>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
        >
          Tableau de bord
        </Link>
        <Link href="/" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600">
          Accueil public
        </Link>
      </div>
    </div>
  );
}
