import { AgentTicketConversation } from "@/components/Ticket/TicketConversation";
import { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Ticket | Support | Endeavor",
};

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <section className="w-full max-w-6xl scroll-mt-32 px-2 pt-2 pb-2 sm:px-4 sm:pt-4 sm:pb-4">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-midnight_text dark:text-white">
        Détails du ticket
      </h1>
      <AgentTicketConversation ticketId={id} />
    </section>
  );
}
