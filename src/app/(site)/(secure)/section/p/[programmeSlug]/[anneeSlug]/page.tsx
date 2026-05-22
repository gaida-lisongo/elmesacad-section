import { getSessionPayload } from "@/lib/auth/sessionServer";
import SectionProgrammeParcoursClient from "./SectionProgrammeParcoursClient";
import { connectDB } from "@/lib/services/connectedDB";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { ProgrammeModel } from "@/lib/models/Programme";
import { AnneeModel } from "@/lib/models/Annee";
import { listParcoursStudentService } from "@/actions/gestionnaireParcours";

export default async function SectionProgrammeParcoursPage({
  params,
}: {
  params: Promise<{ programmeSlug: string; anneeSlug: string }>;
}) {
  try {
    const { programmeSlug, anneeSlug } = await params;
    console.log("Received params:", { programmeSlug, anneeSlug });
  
    //Scope
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            Accès refusé
          </h1>
        </div>
      );
    }

    await connectDB();
    const scope = await resolveGestionnaireScope(session.sub);
    if (!scope || !scope.sectionSlug) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            Accès refusé : section non trouvée
          </h1>
        </div>
      );
    }

    //Programme
    const programme = await ProgrammeModel.findOne({ slug: programmeSlug }).lean();
    console.log("Fetched programme:", programme);
    if (!programme) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            Programme non trouvé
          </h1>
        </div>
      );
    }
  
    //Annee
    const annee = await AnneeModel.findOne({ slug: anneeSlug }).lean();
      console.log("Fetched annee:", annee);
    if (!annee) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            Année non trouvée
          </h1>
        </div>
      );
    }
  
    //Parcours
    const listData = await listParcoursStudentService({
      anneeSlug: anneeSlug,
      filiereSlug: String(scope?.sectionSlug ?? ""),
      classeSlug: String(programmeSlug),
      search: "",
      page: 1,
      limit: 13000,
    });

    console.log("Fetched parcours data:", listData);

    const parcours = (listData.data ?? []).map((p: any) => ({
      id: String(p._id ?? p.id ?? ""),
      nomComplet: String(p.nomComplet ?? ""),
      matricule: String(p.matricule ?? ""),
      email: String(p.email ?? ""),
      sexe: String(p.sexe ?? ""),
      nationalite: String(p.nationalite ?? ""),
      date_naissance: String(p.date_naissance ?? ""),
      lieu_naissance: String(p.lieu_naissance ?? ""),
      photo: String(p.photo ?? ""),
      status: String(p.status ?? ""),
      reference: String(p.reference ?? ""),
    }));

    
  
    return <SectionProgrammeParcoursClient 
      programmeSlug={programmeSlug} 
      anneeSlug={anneeSlug} 
      programme={programme}
      annee={annee}
      autorizations={{
        canCreateDelete: (scope.isAppariteur || scope.isChefSection) ?? false,
        canUpdateStatus: (scope.isSecretaire || scope.isChefSection) ?? false,
      }}
      parcours={parcours}
    />;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in SectionProgrammeParcoursPage:", message);
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          Désolé, une erreur est survenue lors du chargement de la page.
        </h1>
        <p className="text-slate-600">{message}</p>
      </div>
    );
  }
}
