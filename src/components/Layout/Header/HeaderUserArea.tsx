"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";

type Props = {
  onNavigate?: () => void;
  classNameLink?: string;
  compact?: boolean;
};

export function HeaderUserArea({ onNavigate, classNameLink, compact }: Props) {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return <div className="h-9 w-24 max-w-full animate-pulse rounded-lg bg-white/20 dark:bg-gray-700" />;
  }

  if (user) {
    return (
      <Link
        href="/profile"
        onClick={onNavigate}
        className={
          classNameLink ??
          `inline-flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-[#082b1c]/30 dark:border-gray-600 dark:bg-gray-800 sm:pl-1.5 sm:pr-3 ${
            compact ? "max-w-[10rem] sm:max-w-[12rem]" : "max-w-[16rem] sm:max-w-[20rem]"
          }`
        }
      >
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-gray-200 dark:ring-gray-600 sm:h-9 sm:w-9">
          <Image
            src={user.photo}
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 object-cover sm:h-9 sm:w-9"
          />
        </span>
        <span className="min-w-0 flex-1 text-left text-midnight_text dark:text-white">
          <span className="block truncate text-xs font-bold leading-tight sm:text-sm">{user.name}</span>
          <span className="block truncate text-[10px] text-gray-500 sm:text-xs dark:text-gray-400">
            {user.matricule}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div
      className={compact ? "flex w-full flex-col gap-2" : "hidden items-center space-x-2 lg:flex"}
    >
      <Link
        href="/signin"
        onClick={onNavigate}
        className={
          compact
            ? "bg-transparent border border-primary text-primary w-full text-center rounded-lg py-2"
            : "bg-error text-sm hover:bg-error/90 text-white px-4 py-3.5 leading-none rounded-lg font-medium"
        }
      >
        Se connecter
      </Link>
      <Link
        href="/signup"
        onClick={onNavigate}
        className={
          compact
            ? "bg-primary text-white w-full text-center rounded-lg py-2"
            : "text-sm bg-dark hover:bg-dark/90 text-white px-4 py-3.5 leading-none rounded-lg font-medium"
        }
      >
        Créer un compte
      </Link>
    </div>
  );
}
