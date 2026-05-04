import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";

export type StudentItem = {
  id: string;
  name: string;
  matricule: string;
  email: string;
  diplome: string;
  status: "active" | "inactive";
  photo: string;
  cycle: string;
  depositsCount: number;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

export function StudentCardItem({ item }: { item: StudentItem }) {
  const accountClass =
    item.status === "active"
      ? "bg-primary/15 text-emerald-700 ring-1 ring-primary/25 dark:bg-primary/20 dark:text-emerald-300"
      : "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200";

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/90 p-5 shadow-[0_4px_24px_-4px_rgba(5, 138, 197,0.12),0_8px_16px_-8px_rgba(0,0,0,0.08)] ring-1 ring-gray-200/80 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(5, 138, 197,0.18),0_4px_12px_-4px_rgba(0,0,0,0.08)] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 dark:ring-gray-700/80">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/8 to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-primary/5 blur-xl" />

      <div className="relative flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-md ring-2 ring-white dark:ring-gray-800">
          <Image
            src={item.photo || "/images/blog/blog_2.jpg"}
            alt={item.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="64px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-base font-bold tracking-tight text-midnight_text dark:text-white">
              {item.name}
            </h3>
            <span
              className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${accountClass}`}
            >
              <Icon
                icon={item.status === "active" ? "solar:user-check-rounded-bold" : "solar:user-block-rounded-bold"}
                className="h-3.5 w-3.5 shrink-0"
              />
              {item.status === "active" ? "Compte créé" : "Pas de compte"}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
            <Icon icon="solar:letter-bold-duotone" className="h-4 w-4 shrink-0 text-primary/70" />
            {item.email}
          </p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-gray-100/80 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02] dark:bg-gray-800/50 dark:ring-gray-700/60">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Icon icon="solar:id-card-bold-duotone" className="h-3.5 w-3.5" />
            Matricule
          </p>
          <p className="mt-1 font-semibold text-midnight_text dark:text-white">{item.matricule}</p>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-gray-100/80 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02] dark:bg-gray-800/50 dark:ring-gray-700/60">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Icon icon="solar:round-graph-bold-duotone" className="h-3.5 w-3.5" />
            Cycle
          </p>
          <p className="mt-1 line-clamp-2 font-semibold text-midnight_text dark:text-white">{item.cycle}</p>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-gray-100/80 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02] dark:bg-gray-800/50 dark:ring-gray-700/60">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Icon icon="solar:diploma-bold-duotone" className="h-3.5 w-3.5" />
            Diplôme
          </p>
          <p className="mt-1 line-clamp-1 font-semibold text-midnight_text dark:text-white">{item.diplome}</p>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-gray-100/80 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02] dark:bg-gray-800/50 dark:ring-gray-700/60">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Icon icon="solar:box-minimalistic-bold-duotone" className="h-3.5 w-3.5" />
            Dépôts
          </p>
          <p className="mt-1 font-semibold text-midnight_text dark:text-white">{item.depositsCount}</p>
        </div>
      </div>

      <Link
        href={`/etudiants/${item.id}`}
        className="group/btn mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30"
      >
        Voir le détail
        <Icon
          icon="solar:arrow-right-linear"
          className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

type StudentCardCreateProps = {
  defaultCycle: string;
};

export function StudentCardCreate({ defaultCycle }: StudentCardCreateProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-50/95 to-white p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] ring-1 ring-gray-200/90 dark:from-gray-900 dark:to-gray-900 dark:ring-gray-700">
      <div className="grid gap-3 rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-gray-900/40 md:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Icon icon="solar:user-bold-duotone" className="h-4 w-4 text-primary" />
            Nom
          </label>
          <input name="name" placeholder="Nom de l'étudiant" className={inputClass} required />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Icon icon="solar:letter-bold-duotone" className="h-4 w-4 text-primary" />
            Email
          </label>
          <input name="email" type="email" placeholder="email@exemple.com" className={inputClass} required />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Icon icon="solar:id-card-bold-duotone" className="h-4 w-4 text-primary" />
            Matricule
          </label>
          <input name="matricule" placeholder="Ex. ET-0001" className={inputClass} required />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Icon icon="solar:diploma-bold-duotone" className="h-4 w-4 text-primary" />
            Diplôme
          </label>
          <input name="diplome" placeholder="Diplôme" className={inputClass} required />
        </div>
        <div className="flex items-end md:col-span-2">
          <div className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
            <Icon icon="solar:round-graph-bold-duotone" className="h-5 w-5 text-primary" />
            <span>
              Cycle appliqué :{" "}
              <span className="font-semibold text-midnight_text dark:text-white">{defaultCycle}</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 md:col-span-2">
          Changez d&apos;onglet pour inscrire un autre cycle.
        </p>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition duration-300 hover:scale-[1.01] hover:shadow-xl md:col-span-2"
        >
          <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
          Créer l&apos;étudiant
        </button>
      </div>
    </div>
  );
}
