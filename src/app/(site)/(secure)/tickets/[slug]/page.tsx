import TicketChatLayout from "@/components/secure/TicketChatLayout";

export default async function TicketDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <TicketChatLayout
      title={`Ticket #${slug}`}
      activeTickets={[
        { id: "t-1001", title: "Paiement bloque", lastMessage: "Besoin d'assistance..." },
        { id: "t-1002", title: "Erreur inscription", lastMessage: "Le formulaire echoue..." },
      ]}
      archivedTickets={[
        { id: "t-0950", title: "Acces compte", lastMessage: "Resolue hier" },
        { id: "t-0931", title: "Verification email", lastMessage: "Ferme" },
      ]}
      messages={[
        { id: "m1", from: "user", content: "Bonjour, j'ai un probleme de ticket.", at: "10:02" },
        { id: "m2", from: "operator", content: "Bonjour, je suis la pour vous aider.", at: "10:03" },
        { id: "m3", from: "user", content: "Je ne peux pas valider mon paiement.", at: "10:04" },
      ]}
    />
  );
}
