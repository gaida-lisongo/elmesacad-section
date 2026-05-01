"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import AuthDialogContext from "@/app/context/AuthDialogContext";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import {
  MAIL_ACCOUNT_PASSWORD_MAX_LENGTH,
  MAIL_ACCOUNT_PASSWORD_MIN_LENGTH,
  createMailAccountAction,
  mailAccountExistsAction,
} from "@/lib/mail-accounts";
import type { AgentListItem, StudentListItem } from "@/lib/services/UserManager";

const DEFAULT_PHOTO = "/images/user.jpg";

type AccountKind = "student" | "agent";

type Props = {
  onClose: () => void;
  onOpenSignIn: () => void;
};

const fieldClass =
  "w-full rounded-lg border border-border dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 px-4 py-2.5 text-sm text-midnight_text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:text-white";

const labelClass = "mb-1.5 block text-left text-xs font-medium text-gray-600 dark:text-gray-300";

const steps = [
  { n: 1, label: "Votre profil" },
  { n: 2, label: "Accès e-mail" },
  { n: 3, label: "Informations" },
];

export function AccountRegistrationWizard({ onClose, onOpenSignIn }: Props) {
  const authDialog = useContext(AuthDialogContext);
  const [accountKind, setAccountKind] = useState<AccountKind>("student");
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<AgentListItem | StudentListItem | null>(null);
  const [searchResetKey, setSearchResetKey] = useState(0);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step2Loading, setStep2Loading] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);

  const [profile, setProfile] = useState({
    sexe: "M" as "M" | "F",
    dateDeNaissance: "",
    nationalite: "",
    lieuDeNaissance: "",
    adresse: "",
    telephone: "",
    ville: "",
    diplome: "",
  });

  useEffect(() => {
    setStep(1);
    setSelected(null);
    setSearchResetKey((k) => k + 1);
  }, [accountKind]);

  useEffect(() => {
    if (step === 3 && selected) {
      setProfile((p) => ({ ...p, diplome: selected.diplome ?? p.diplome }));
    }
  }, [step, selected]);

  const photoSrc = selected?.photo || DEFAULT_PHOTO;

  const goStep2 = () => {
    if (!selected) {
      toast.error("Sélectionnez une personne dans la base.");
      return;
    }
    if (selected.status === "active") {
      return;
    }
    setStep(2);
  };

  const goStep3From2 = async () => {
    if (!selected) {
      return;
    }
    if (password.length < MAIL_ACCOUNT_PASSWORD_MIN_LENGTH) {
      toast.error(`Le mot de passe doit contenir au moins ${MAIL_ACCOUNT_PASSWORD_MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setStep2Loading(true);
    try {
      /** Un seul flux : microservice mail (ACCOUNT_SERVICE) — GET exists puis POST création boîte. */
      const existsRes = await mailAccountExistsAction(selected.email);
      if (!existsRes.success) {
        toast.error(existsRes.error);
        return;
      }
      if (!existsRes.data.exists) {
        const createRes = await createMailAccountAction(selected.email, password);
        if (!createRes.success) {
          toast.error(createRes.error);
          return;
        }
        toast.success("Boîte mail créée sur le serveur mail.");
      }
      setStep(3);
    } finally {
      setStep2Loading(false);
    }
  };

  const finishStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      return;
    }
    if (!profile.dateDeNaissance.trim()) {
      toast.error("Indiquez votre date de naissance.");
      return;
    }
    setStep3Loading(true);
    try {
      const path = accountKind === "student" ? `/api/student/${selected.id}` : `/api/agent/${selected.id}`;
      const body = {
        sexe: profile.sexe,
        dateDeNaissance: new Date(profile.dateDeNaissance).toISOString(),
        nationalite: profile.nationalite,
        lieuDeNaissance: profile.lieuDeNaissance,
        adresse: profile.adresse,
        telephone: profile.telephone,
        ville: profile.ville,
        diplome: profile.diplome,
        status: "active" as const,
      };

      const res = await fetch(path, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? `Erreur ${res.status}`);
      }

      toast.success("Inscription enregistrée. Connectez-vous avec l’e-mail (OTP).");
      authDialog?.setIsUserRegistered(true);
      setTimeout(() => authDialog?.setIsUserRegistered(false), 2500);
      onClose();
      onOpenSignIn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setStep3Loading(false);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 text-left md:flex-row md:items-stretch">
      <div className="relative hidden w-full min-h-[200px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 md:block md:max-w-[280px]">
        <Image
          src={photoSrc}
          alt=""
          fill
          className="object-cover opacity-90"
          sizes="280px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white drop-shadow">
          {selected ? selected.name : "Création de compte INBTP"}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-center gap-1 md:justify-start">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  step >= s.n
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {s.n}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-0.5 h-0.5 w-4 md:w-6 ${step > s.n ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"}`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400 md:text-left">
          {steps[step - 1]?.label}
        </p>

        <div className="mb-4 flex rounded-xl bg-gray-100/80 p-1 dark:bg-gray-800/80">
          {(["student", "agent"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAccountKind(k)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                accountKind === k
                  ? "bg-white text-primary shadow dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {k === "student" ? "Étudiant" : "Agent"}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Recherchez votre fiche (nom, matricule ou e-mail) pour lier le compte.
            </p>
            <div className="relative mb-2 h-32 w-full overflow-hidden rounded-xl md:hidden">
              <Image src={photoSrc} alt="" fill className="object-cover" sizes="100vw" />
            </div>
            <UserDatabaseSearch
              key={searchResetKey}
              kind={accountKind}
              clearOnSelect
              placeholder="Rechercher un utilisateur…"
              onSelect={(item: AgentListItem | StudentListItem) => setSelected(item)}
            />
            {selected && (
              <div className="rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white to-gray-50/80 p-4 text-left dark:border-gray-600 dark:from-gray-800 dark:to-gray-900/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Utilisateur sélectionné
                </p>
                <p className="mt-1 font-bold text-midnight_text dark:text-white">{selected.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selected.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Mat. {selected.matricule}</p>
                {accountKind === "agent" && (
                  <p className="mt-1 text-xs text-gray-500">Rôle : {(selected as AgentListItem).role}</p>
                )}
                {accountKind === "student" && (
                  <p className="mt-1 text-xs text-gray-500">Cycle : {(selected as StudentListItem).cycle}</p>
                )}
                <p className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selected.status === "active"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                    }`}
                  >
                    <Icon
                      icon={selected.status === "active" ? "solar:user-check-rounded-bold" : "solar:hourglass-line-bold"}
                      className="h-3.5 w-3.5"
                    />
                    {selected.status === "active" ? "Compte applicatif actif" : "Pas encore de compte applicatif actif"}
                  </span>
                </p>
                {selected.status === "active" && (
                  <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    Cet utilisateur a déjà un compte. Utilisez la connexion.
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onOpenSignIn} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-500 dark:text-gray-200">
                Déjà inscrit ? Se connecter
              </button>
              <button
                type="button"
                onClick={goStep2}
                disabled={!selected || selected.status === "active"}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Définissez le mot de passe de votre boîte mail. S’il en existe déjà une pour cet e-mail, vous
              passerez directement à l’étape suivante.
            </p>
            <div>
              <label className={labelClass}>Mot de passe</label>
              <input
                type="password"
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={MAIL_ACCOUNT_PASSWORD_MAX_LENGTH}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {MAIL_ACCOUNT_PASSWORD_MIN_LENGTH}–{MAIL_ACCOUNT_PASSWORD_MAX_LENGTH} caractères (limite imposée par le
                serveur mail).
              </p>
            </div>
            <div>
              <label className={labelClass}>Confirmer le mot de passe</label>
              <input
                type="password"
                className={fieldClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={MAIL_ACCOUNT_PASSWORD_MAX_LENGTH}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-500">
                Retour
              </button>
              <button
                type="button"
                onClick={goStep3From2}
                disabled={step2Loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {step2Loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {step2Loading ? "Vérification…" : "Continuer"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={finishStep3} className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">Complétez votre profil pour activer l’accès.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Sexe</label>
                <select
                  className={fieldClass}
                  value={profile.sexe}
                  onChange={(e) => setProfile((p) => ({ ...p, sexe: e.target.value as "M" | "F" }))}
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date de naissance</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={profile.dateDeNaissance}
                  onChange={(e) => setProfile((p) => ({ ...p, dateDeNaissance: e.target.value }))}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Nationalité</label>
                <input
                  className={fieldClass}
                  value={profile.nationalite}
                  onChange={(e) => setProfile((p) => ({ ...p, nationalite: e.target.value }))}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Lieu de naissance</label>
                <input
                  className={fieldClass}
                  value={profile.lieuDeNaissance}
                  onChange={(e) => setProfile((p) => ({ ...p, lieuDeNaissance: e.target.value }))}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Adresse</label>
                <input
                  className={fieldClass}
                  value={profile.adresse}
                  onChange={(e) => setProfile((p) => ({ ...p, adresse: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input
                  className={fieldClass}
                  value={profile.telephone}
                  onChange={(e) => setProfile((p) => ({ ...p, telephone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Ville</label>
                <input
                  className={fieldClass}
                  value={profile.ville}
                  onChange={(e) => setProfile((p) => ({ ...p, ville: e.target.value }))}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Diplôme</label>
                <input
                  className={fieldClass}
                  value={profile.diplome}
                  onChange={(e) => setProfile((p) => ({ ...p, diplome: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-500">
                Retour
              </button>
              <button
                type="submit"
                disabled={step3Loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {step3Loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Valider et activer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
