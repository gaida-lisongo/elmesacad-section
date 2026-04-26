import { Metadata } from "next";
import { PublicTicketConversation } from "@/components/Ticket/TicketConversation";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Ticket ${decodeURIComponent(reference)} | Endeavor`,
  };
}

export default async function TicketPage({ params }: Props) {
  const { reference } = await params;
  const ref = decodeURIComponent(reference);

  return (
    <section className="pt-below-site-header container mx-auto max-w-3xl scroll-mt-8 px-4 pb-10">
      <h1 className="mb-2 text-2xl font-bold text-midnight_text dark:text-white">Votre demande</h1>
      <PublicTicketConversation reference={ref} />
    </section>
  );
}
