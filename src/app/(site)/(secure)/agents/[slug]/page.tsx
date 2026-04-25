import PageDetail from "@/components/secure/PageDetail";
import { AgentItem } from "@/app/(site)/(secure)/agents/_components/AgentCards";
import AgentDetailCard from "@/app/(site)/(secure)/agents/_components/AgentDetailCard";
import { connectDB } from "@/lib/services/connectedDB";
import { AgentModel, AuthorizationModel } from "@/lib/models/User";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

type AuthorizationView = {
  id: string;
  designation: string;
  code: string;
};

export default async function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!Types.ObjectId.isValid(slug)) {
    notFound();
  }

  await connectDB();
  const agentDoc = await AgentModel.findById(slug);
  if (!agentDoc) {
    notFound();
  }

  const authorizationDocs = await AuthorizationModel.find({ agentId: agentDoc._id })
    .sort({ createdAt: -1 })
    .lean();

  const agent: AgentItem = {
    id: agentDoc._id.toString(),
    name: agentDoc.name,
    email: agentDoc.email,
    matricule: agentDoc.matricule,
    diplome: agentDoc.diplome,
    photo: agentDoc.photo,
    role: agentDoc.role,
    status: agentDoc.status,
    authorizationsCount: authorizationDocs.length,
  };

  const initialAuthorizations: AuthorizationView[] = authorizationDocs.map((item) => ({
    id: item._id.toString(),
    designation: item.designation,
    code: item.code,
  }));

  const Card = () => (
    <AgentDetailCard
      agent={agent}
      initialAuthorizations={initialAuthorizations}
    />
  );

  return (
    <PageDetail
      title={`Detail agent: ${agent.name}`}
      description="Visualiser et editer les informations de l'agent"
      breadcrumbs={[
        { href: "/", text: "Home" },
        { href: "/agents", text: "Agents" },
        { href: `/agents/${agent.id}`, text: agent.name },
      ]}
      CardDetail={Card}
    />
  );
}
