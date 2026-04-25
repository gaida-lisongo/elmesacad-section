"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { Icon } from "@iconify/react";

export function ProfileView() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

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
        <button
          type="button"
          onClick={() => void hydrate()}
          className="text-sm font-medium underline"
        >
          Recharger
        </button>{" "}
        ou{" "}
        <Link href="/signin" className="font-medium underline">
          vous connecter
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#082b1c]/20 bg-white p-8 text-center dark:bg-gray-900/80 sm:flex-row sm:text-left">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl ring-4 ring-[#082b1c]/20">
          <Image src={user.photo} alt="" width={112} height={112} className="h-28 w-28 object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#082b1c]">
            {user.accountLabel}
          </p>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{user.name}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
          <p className="mt-2 text-sm text-gray-500">
            <Icon icon="solar:id-card-bold" className="inline h-4 w-4" /> Matricule :{" "}
            <span className="font-semibold text-midnight_text dark:text-white">{user.matricule}</span>
          </p>
          {user.kind === "student" && (
            <p className="mt-1 text-sm text-gray-500">
              Cycle : <span className="font-medium text-midnight_text dark:text-white">{user.cycle}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-[#082b1c] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Tableau de bord
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-600"
        >
          Accueil public
        </Link>
      </div>
    </div>
  );
}
