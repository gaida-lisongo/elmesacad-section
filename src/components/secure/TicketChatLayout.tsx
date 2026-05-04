type TicketItem = {
  id: string;
  title: string;
  lastMessage: string;
};

type Message = {
  id: string;
  from: "operator" | "user";
  content: string;
  at: string;
};

type TicketChatLayoutProps = {
  activeTickets: TicketItem[];
  archivedTickets: TicketItem[];
  messages: Message[];
  title?: string;
};

export default function TicketChatLayout({
  activeTickets,
  archivedTickets,
  messages,
  title = "Ticket Conversation",
}: TicketChatLayoutProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-4 xl:col-span-3">
        <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Tickets actifs</h2>
        <ul className="mt-3 space-y-2">
          {activeTickets.map((ticket) => (
            <li key={ticket.id} className="rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
              <p className="font-semibold text-midnight_text dark:text-white">{ticket.title}</p>
              <p className="text-xs text-gray-500">{ticket.lastMessage}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-semibold text-midnight_text dark:text-white">Tickets archives</h3>
        <ul className="mt-3 space-y-2">
          {archivedTickets.map((ticket) => (
            <li key={ticket.id} className="rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
              <p className="font-semibold text-midnight_text dark:text-white">{ticket.title}</p>
              <p className="text-xs text-gray-500">{ticket.lastMessage}</p>
            </li>
          ))}
        </ul>
      </aside>

      <article className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-8 xl:col-span-9">
        <header className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-base font-semibold text-midnight_text dark:text-white">{title}</h2>
        </header>

        <div className="h-[480px] space-y-3 overflow-y-auto p-4">
          {messages.map((message) => {
            const isOperator = message.from === "operator";
            return (
              <div key={message.id} className={`flex ${isOperator ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                    isOperator
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`mt-1 text-[10px] ${isOperator ? "text-white/70" : "text-gray-500"}`}>
                    {message.at}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ecrire un message..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
              Envoyer
            </button>
          </div>
        </footer>
      </article>
    </section>
  );
}
