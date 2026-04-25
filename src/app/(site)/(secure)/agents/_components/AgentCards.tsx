import Link from "next/link";
import Image from "next/image";

export type AgentItem = {
  id: string;
  name: string;
  matricule: string;
  email: string;
  diplome: string;
  photo: string;
  role: string;
  status: "active" | "inactive";
  authorizationsCount: number;
};

export function AgentCardItem({ item }: { item: AgentItem }) {
  const statusClass =
    item.status === "active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <div className="group rounded-xl bg-white dark:bg-darkmode">
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
          <Image
            src={item.photo || "/images/blog/blog_2.jpg"}
            alt={item.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-midnight_text dark:text-white">
              {item.name}
            </h3>
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
              {item.status}
            </span>
          </div>
          <p className="truncate text-xs text-gray-500">{item.email}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-gray-500">Matricule</p>
          <p className="mt-1 font-semibold text-midnight_text dark:text-white">{item.matricule}</p>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-gray-500">Role</p>
          <p className="mt-1 font-semibold capitalize text-midnight_text dark:text-white">{item.role}</p>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-gray-500">Diplome</p>
          <p className="mt-1 font-semibold text-midnight_text dark:text-white">{item.diplome}</p>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-gray-500">Autorisations</p>
          <p className="mt-1 font-semibold text-midnight_text dark:text-white">
            {item.authorizationsCount}
          </p>
        </div>
      </div>

      <Link
        href={`/agents/${item.id}`}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition group-hover:text-warning"
      >
        Voir details
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

type AgentCardCreateProps = {
  defaultRole: string;
};

export function AgentCardCreate({ defaultRole }: AgentCardCreateProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <input name="name" placeholder="Nom agent" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="email" placeholder="Email agent" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="matricule" placeholder="Matricule" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="diplome" placeholder="Diplome" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <p className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Role selectionne: {defaultRole}
      </p>
      <button type="submit" className="rounded bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white md:col-span-2">
        Creer agent
      </button>
    </div>
  );
}

export function AgentCardDetail({ item }: { item: AgentItem }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input defaultValue={item.name} name="name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.email} name="email" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.matricule} name="matricule" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.diplome} name="diplome" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.role} name="role" className="rounded border border-gray-300 px-3 py-2 text-sm" />
    </div>
  );
}
