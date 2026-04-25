import PageDetail from "@/components/secure/PageDetail";
import StudentDetailCard, { StudentDetailView } from "@/app/(site)/(secure)/etudiants/_components/StudentDetailCard";
import { connectDB } from "@/lib/services/connectedDB";
import { StudentModel } from "@/lib/models/User";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

export default async function StudentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!Types.ObjectId.isValid(slug)) {
    notFound();
  }

  await connectDB();
  const doc = await StudentModel.findById(slug).lean();
  if (!doc) {
    notFound();
  }

  const student: StudentDetailView = {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    matricule: doc.matricule,
    diplome: doc.diplome,
    photo: doc.photo,
    status: doc.status,
    cycle: doc.cycle,
  };

  const Card = () => <StudentDetailCard student={student} />;

  return (
    <PageDetail
      title={`Détail étudiant : ${student.name}`}
      description="Informations et dépôts de l&apos;étudiant"
      breadcrumbs={[
        { href: "/", text: "Home" },
        { href: "/etudiants", text: "Étudiants" },
        { href: `/etudiants/${student.id}`, text: student.name },
      ]}
      CardDetail={Card}
    />
  );
}
