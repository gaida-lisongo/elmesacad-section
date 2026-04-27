"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import Logo from "@/components/Layout/Header/Logo";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import type { Agent, Authorization, Student } from "@/lib/models/User";
import { mapJsonUserToAuthUser } from "@/lib/auth/mapToAuthUser";
import type { AgentListItem, StudentListItem } from "@/lib/services/UserManager";
import { useAuthStore } from "@/stores/authStore";

type AccountKind = "student" | "agent";

const steps = [
  { n: 1, label: "Identifiant" },
  { n: 2, label: "Code OTP" },
  { n: 3, label: "Bienvenue" },
];

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white/90 px-4 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-white focus:border-[#082b1c] focus:ring-2 focus:ring-[#082b1c]/20";

type AgentWithAuth = Agent & { authorizations: Authorization[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function OtpSignInFlow() {
  const setAuthUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const [accountKind, setAccountKind] = useState<AccountKind>("student");
  const [step, setStep] = useState(1);
  const [searchKey, setSearchKey] = useState(0);
  const [selected, setSelected] = useState<AgentListItem | StudentListItem | null>(null);
  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  const requestOtp = async () => {
    if (!selected) {
      toast.error("Sélectionnez d’abord un utilisateur.");
      return;
    }
    setRequestLoading(true);
    try {
      const path = accountKind === "student" ? "/api/student" : "/api/agent";
      const res = await fetch(path, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "requestOtp", email: selected.email }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(j.message ?? `Erreur ${res.status}`);
      }
      setEmail(selected.email);
      toast.success("Un code a été envoyé à votre e-mail.");
      setStep(2);
      setOtp("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi du code impossible.");
    } finally {
      setRequestLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Saisissez le code à 6 chiffres reçu par e-mail.");
      return;
    }
    setVerifyLoading(true);
    try {
      const path = accountKind === "student" ? "/api/student" : "/api/agent";
      const res = await fetch(path, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyOtp", email, otp: otp.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        message?: string;
        data?: unknown;
      };
      if (!res.ok) {
        throw new Error(j.message ?? `Erreur ${res.status}`);
      }
      if (j.data && isRecord(j.data)) {
        setProfile(j.data);
        setAuthUser(mapJsonUserToAuthUser(j.data, accountKind));
      } else {
        setProfile(null);
      }
      setStep(3);
      void router.refresh();
      toast.success("Connexion confirmée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Code incorrect ou expiré.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const displayName = profile && typeof profile.name === "string" ? profile.name : "Utilisateur";

  const goStep1 = () => {
    setStep(1);
    setOtp("");
    setProfile(null);
  };

  return (
    <div className="mx-auto w-full max-w-3xl text-left">
      <Toaster position="top-center" />
      <div className="mb-8 text-center">
        <Logo />
      </div>

      <div className="mb-6 flex items-center justify-center gap-1">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                step >= s.n
                  ? "bg-[#082b1c] text-white"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {s.n}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-0.5 h-0.5 w-4 sm:w-8 ${step > s.n ? "bg-[#082b1c]" : "bg-gray-200 dark:bg-gray-600"}`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {steps[step - 1]?.label}
      </p>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Choisissez le type de compte, puis recherchez votre fiche (nom, matricule ou e-mail).
          </p>
          <div className="flex rounded-xl bg-gray-100/80 p-1 dark:bg-gray-800/80">
            {(["student", "agent"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setAccountKind(k);
                  setSelected(null);
                  setSearchKey((n) => n + 1);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                  accountKind === k
                    ? "bg-white text-[#082b1c] shadow dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {k === "student" ? "Étudiant" : "Agent"}
              </button>
            ))}
          </div>
          <UserDatabaseSearch
            key={searchKey}
            kind={accountKind}
            clearOnSelect
            onSelect={(item: AgentListItem | StudentListItem) => setSelected(item)}
            placeholder="Rechercher votre e-mail / nom / matricule…"
          />
          {selected && (
            <div className="rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white to-gray-50/80 p-4 dark:border-gray-600 dark:from-gray-800 dark:to-gray-900/80">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Compte ciblé
              </p>
              <p className="mt-1 font-bold text-midnight_text dark:text-white">{selected.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{selected.email}</p>
              {accountKind === "agent" && (
                <p className="text-xs text-gray-500">Rôle : {(selected as AgentListItem).role}</p>
              )}
              {accountKind === "student" && (
                <p className="text-xs text-gray-500">Cycle : {(selected as StudentListItem).cycle}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/signup"
              className="text-center text-sm text-[#082b1c] underline dark:text-emerald-400"
            >
              Créer un compte
            </Link>
            <button
              type="button"
              onClick={requestOtp}
              disabled={!selected || requestLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#082b1c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {requestLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {requestLoading ? "Envoi en cours…" : "Recevoir le code par e-mail"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Saisissez le code à 6 chiffres envoyé à <strong className="text-midnight_text dark:text-white">{email}</strong>.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Code OTP
            </label>
            <input
              className={fieldClass + " text-center text-2xl tracking-[0.4em]"}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={goStep1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-500"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={verifyLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#082b1c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {verifyLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              Vérifier
            </button>
          </div>
        </form>
      )}

      {step === 3 && profile && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-5 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-gray-900/80">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white dark:ring-gray-700">
                <Image
                  src={typeof profile.photo === "string" ? profile.photo : "/images/user.jpg"}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Bienvenue !</p>
                <h2 className="text-xl font-bold text-midnight_text dark:text-white">{displayName}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {typeof profile.email === "string" ? profile.email : ""}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Votre session est active. Vous trouverez ci-dessous un résumé de votre dossier.
                </p>
              </div>
            </div>
          </div>

          {accountKind === "student" && <StudentPanel user={profile as unknown as Student} />}
          {accountKind === "agent" && <AgentPanel user={profile as unknown as AgentWithAuth} />}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium dark:border-gray-500"
            >
              Retour à l’accueil
            </Link>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-lg bg-[#082b1c] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentPanel({ user }: { user: Student }) {
  const deposits = user.deposits ?? [];
  const transactions = user.transactions ?? [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-gray-200/90 bg-white/90 p-4 dark:border-gray-600 dark:bg-gray-800/60">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-midnight_text dark:text-white">
          <Icon icon="solar:wallet-money-bold-duotone" className="h-5 w-5 text-[#082b1c]" />
          Dépôts
        </h3>
        {deposits.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun dépôt enregistré.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {deposits.map((d, i) => (
              <li
                key={`d-${i}`}
                className="flex justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-900/50"
              >
                <span>
                  {d.amount} {d.currency} — {d.status}
                </span>
                {d.orderNumber && <span className="text-xs text-gray-500">{d.orderNumber}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-gray-200/90 bg-white/90 p-4 dark:border-gray-600 dark:bg-gray-800/60">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-midnight_text dark:text-white">
          <Icon icon="solar:document-text-bold-duotone" className="h-5 w-5 text-[#082b1c]" />
          Transactions
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune transaction.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {transactions.map((t, i) => (
              <li
                key={`t-${i}`}
                className="flex flex-col rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-900/50"
              >
                <span className="font-medium">
                  {t.amount} — {t.categorie}
                </span>
                <span className="text-xs text-gray-500">
                  {t.status} {t.ressourceId && `· ${t.ressourceId}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AgentPanel({ user }: { user: AgentWithAuth }) {
  const auths = user.authorizations ?? [];
  const w = user.withdrawals ?? [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-gray-200/90 bg-white/90 p-4 dark:border-gray-600 dark:bg-gray-800/60">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-midnight_text dark:text-white">
          <Icon icon="solar:shield-check-bold-duotone" className="h-5 w-5 text-[#082b1c]" />
          Autorisations
        </h3>
        {auths.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune autorisation enregistrée.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {auths.map((a) => (
              <li
                key={String(a._id)}
                className="rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-900/50"
              >
                <span className="font-medium">{a.designation}</span>
                <span className="ml-2 text-xs text-gray-500">({a.code})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-gray-200/90 bg-white/90 p-4 dark:border-gray-600 dark:bg-gray-800/60">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-midnight_text dark:text-white">
          <Icon icon="solar:card-send-bold-duotone" className="h-5 w-5 text-[#082b1c]" />
          Retraits
        </h3>
        {w.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun retrait.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {w.map((r, i) => (
              <li
                key={`w-${i}`}
                className="flex flex-wrap justify-between gap-1 rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-900/50"
              >
                <span>
                  {r.amount} {r.currency} — {r.status}
                </span>
                <span className="text-xs text-gray-500">{r.phoneNumber}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
