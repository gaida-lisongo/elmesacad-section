import Link from "next/link";

export type StudentItem = {
  id: string;
  name: string;
  matricule: string;
  email: string;
  diplome: string;
  status: "active" | "inactive";
};

export function StudentCardItem({ item }: { item: StudentItem }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-midnight_text dark:text-white">{item.name}</h3>
      <p className="text-xs text-gray-500">{item.email}</p>
      <p className="mt-2 text-xs">Matricule: {item.matricule}</p>
      <p className="text-xs">Diplome: {item.diplome}</p>
      <p className="text-xs">Status: {item.status}</p>
      <Link href={`/etudiants/${item.id}`} className="mt-3 inline-block text-xs font-semibold text-[#082b1c]">
        Voir details
      </Link>
    </div>
  );
}

export function StudentCardCreate() {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <input name="name" placeholder="Nom etudiant" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="email" placeholder="Email etudiant" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="matricule" placeholder="Matricule" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input name="diplome" placeholder="Diplome" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <button type="submit" className="rounded bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white md:col-span-2">
        Creer etudiant
      </button>
    </div>
  );
}

export function StudentCardDetail({ item }: { item: StudentItem }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input defaultValue={item.name} name="name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.email} name="email" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.matricule} name="matricule" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input defaultValue={item.diplome} name="diplome" className="rounded border border-gray-300 px-3 py-2 text-sm" />
    </div>
  );
}
