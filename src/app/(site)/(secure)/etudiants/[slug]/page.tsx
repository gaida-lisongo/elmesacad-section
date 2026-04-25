import PageDetail from "@/components/secure/PageDetail";
import {
  StudentCardDetail,
  StudentItem,
} from "@/app/(site)/(secure)/etudiants/_components/StudentCards";

const mockStudents: StudentItem[] = [
  { id: "s1", name: "Grace Ilunga", matricule: "ET-001", email: "grace@inbtp.cd", filiere: "Genie Civil", status: "active" },
  { id: "s2", name: "Merveille Mbuyi", matricule: "ET-002", email: "merveille@inbtp.cd", filiere: "Genie Electrique", status: "active" },
  { id: "s3", name: "Joel Kanku", matricule: "ET-003", email: "joel@inbtp.cd", filiere: "Architecture", status: "inactive" },
];

export default async function StudentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const student = mockStudents.find((item) => item.id === slug) ?? mockStudents[0];

  const Card = () => <StudentCardDetail item={student} />;
  const Modal = () => (
    <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700">
      Modal placeholder pour actions avancees
    </div>
  );

  return (
    <PageDetail
      title={`Detail etudiant: ${student.name}`}
      description="Visualiser et editer les informations de l'etudiant"
      breadcrumbs={[
        { href: "/", text: "Home" },
        { href: "/etudiants", text: "Etudiants" },
        { href: `/etudiants/${student.id}`, text: student.name },
      ]}
      CardDetail={Card}
      Modal={Modal}
      onSave={async () => {
        "use server";
      }}
    />
  );
}
