import Link from "next/link";

const tickets = [
  { id: "t-1001", title: "Paiement bloque", status: "actif" },
  { id: "t-1002", title: "Erreur inscription", status: "actif" },
  { id: "t-1003", title: "Mot de passe oublie", status: "archive" },
];

export default function TicketsPage() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Tickets</h1>
      <p className="mt-1 text-sm text-body-color">
        Liste d'entree vers la messagerie ticket (style whatsapp).
      </p>

      <ul className="mt-5 space-y-2">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-midnight_text dark:text-white">{ticket.title}</p>
              <p className="text-xs text-gray-500">Statut: {ticket.status}</p>
            </div>
            <Link href={`/tickets/${ticket.id}`} className="text-xs font-semibold text-[#082b1c]">
              Ouvrir
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
