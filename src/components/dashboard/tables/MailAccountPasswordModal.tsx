"use client";

import { useEffect, useState } from "react";
import {
  MAIL_ACCOUNT_PASSWORD_MAX_LENGTH,
  MAIL_ACCOUNT_PASSWORD_MIN_LENGTH,
} from "@/lib/mail-accounts";

export type MailModalState = { email: string; rowId: string; kind: "create" | "reset" } | null;

export function MailAccountPasswordModal({
  state,
  busy,
  apiErr,
  onClose,
  onSubmitPassword,
}: {
  state: MailModalState;
  busy: boolean;
  apiErr: string | null;
  onClose: () => void;
  onSubmitPassword: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    if (state) {
      setPassword("");
      setConfirm("");
      setLocalErr(null);
    }
  }, [state]);

  if (!state) return null;

  const title =
    state.kind === "create" ? "Créer le compte mail" : "Réinitialiser le mot de passe mail";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    if (password.length < MAIL_ACCOUNT_PASSWORD_MIN_LENGTH) {
      setLocalErr(`Le mot de passe doit contenir au moins ${MAIL_ACCOUNT_PASSWORD_MIN_LENGTH} caractères.`);
      return;
    }
    if (password.length > MAIL_ACCOUNT_PASSWORD_MAX_LENGTH) {
      setLocalErr(`Maximum ${MAIL_ACCOUNT_PASSWORD_MAX_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setLocalErr("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.trim().toLowerCase() === state.email) {
      setLocalErr("Le mot de passe ne doit pas être identique à l’e-mail.");
      return;
    }
    onSubmitPassword(password);
  };

  const displayErr = localErr || apiErr;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mail-account-password-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <h3
          id="mail-account-password-title"
          className="text-lg font-semibold text-midnight_text dark:text-white"
        >
          {title}
        </h3>
        <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{state.email}</p>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
          Définissez le mot de passe réel de la boîte mail côté serveur (Dovecot / account-service). Il sera transmis
          de façon sécurisée (HTTPS) puis haché par le service.
        </p>

        {displayErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {displayErr}
          </p>
        ) : null}

        <label className="mt-4 block text-xs font-medium text-gray-600 dark:text-gray-300">
          Mot de passe
          <input
            type="password"
            autoComplete="new-password"
            maxLength={MAIL_ACCOUNT_PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">
          Confirmer le mot de passe
          <input
            type="password"
            autoComplete="new-password"
            maxLength={MAIL_ACCOUNT_PASSWORD_MAX_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </label>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {MAIL_ACCOUNT_PASSWORD_MIN_LENGTH}–{MAIL_ACCOUNT_PASSWORD_MAX_LENGTH} caractères.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
          >
            {busy ? "…" : state.kind === "create" ? "Créer le compte" : "Appliquer"}
          </button>
        </div>
      </form>
    </div>
  );
}
