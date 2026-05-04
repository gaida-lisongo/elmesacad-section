"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { LaboratoireModel, type LaboratoireDoc } from "@/lib/models/Laboratoire";
import { EquipementModel } from "@/lib/models/Equipement";
import { ManipulationModel } from "@/lib/models/Manipulation";
import { PostModel } from "@/lib/models/Post";
import { Types } from "mongoose";
import { revalidatePath } from "next/cache";

// --- Laboratoire CRUD ---

export async function getLaboratoireBySlug(slug: string) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findOne({ slug }).populate("techniciens.agent").lean();
    return JSON.parse(JSON.stringify(labo));
  } catch (error) {
    return null;
  }
}

export async function listLaboratoiresPublic() {
  try {
    await connectDB();
    const labos = await LaboratoireModel.find({}).select("nom slug").sort({ nom: 1 }).lean();
    return JSON.parse(JSON.stringify(labos));
  } catch (error) {
    return [];
  }
}

export async function createLaboratoire(data: Partial<LaboratoireDoc>) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.create(data);
    revalidatePath("/dashboard/laboratoires");
    return { success: true, data: JSON.parse(JSON.stringify(labo)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLaboratoire(id: string, data: Partial<LaboratoireDoc>) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findByIdAndUpdate(id, data, { new: true });
    revalidatePath(`/dashboard/laboratoires/${id}`);
    revalidatePath("/dashboard/laboratoires");
    return { success: true, data: JSON.parse(JSON.stringify(labo)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteLaboratoire(id: string) {
  try {
    await connectDB();
    await LaboratoireModel.findByIdAndDelete(id);
    // Optionnel: supprimer les équipements et manipulations liés
    await EquipementModel.deleteMany({ laboratoire: id });
    await ManipulationModel.deleteMany({ laboratoire: id });
    revalidatePath("/dashboard/laboratoires");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLaboratoireById(id: string) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findById(id).populate("techniciens.agent").lean();
    return JSON.parse(JSON.stringify(labo));
  } catch (error) {
    return null;
  }
}

export async function listLaboratoires() {
  try {
    await connectDB();
    const labos = await LaboratoireModel.find({}).lean();
    return JSON.parse(JSON.stringify(labos));
  } catch (error) {
    return [];
  }
}

// --- Equipement CRUD ---

export async function addEquipement(laboId: string, data: any) {
  try {
    await connectDB();
    const equip = await EquipementModel.create({ ...data, laboratoire: laboId });
    revalidatePath(`/dashboard/laboratoires/${laboId}`);
    return { success: true, data: JSON.parse(JSON.stringify(equip)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEquipement(id: string, data: any) {
  try {
    await connectDB();
    const equip = await EquipementModel.findByIdAndUpdate(id, data, { new: true });
    revalidatePath(`/dashboard/laboratoires/${equip?.laboratoire}`);
    return { success: true, data: JSON.parse(JSON.stringify(equip)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Manipulation CRUD ---

export async function addManipulation(laboId: string, data: any) {
  try {
    await connectDB();
    const manip = await ManipulationModel.create({ ...data, laboratoire: laboId });
    revalidatePath(`/dashboard/laboratoires/${laboId}`);
    return { success: true, data: JSON.parse(JSON.stringify(manip)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitManipulationRapport(manipId: string, studentId: string, rapportUrl: string) {
  try {
    await connectDB();
    const manip = await ManipulationModel.findOneAndUpdate(
      { _id: manipId, "etudiantsInscrits.etudiant": studentId },
      {
        $set: {
          "etudiantsInscrits.$.rapportUrl": rapportUrl,
          "etudiantsInscrits.$.status": "soumis",
          "etudiantsInscrits.$.dateSoumission": new Date(),
        },
      },
      { new: true }
    );
    revalidatePath(`/dashboard/laboratoires/${manip?.laboratoire}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function toStudentObjectIdRef(studentId: unknown): string {
  if (studentId && typeof studentId === "object" && studentId !== null && "_id" in studentId) {
    return String((studentId as { _id: unknown })._id);
  }
  return String(studentId ?? "");
}

export async function gradeManipulation(
  manipId: string,
  studentId: string,
  data: { score: number; observations: unknown; decision: unknown }
) {
  try {
    await connectDB();
    const sid = toStudentObjectIdRef(studentId);
    const observations =
      typeof data.observations === "string" ? data.observations.trim() : String(data.observations ?? "").trim();
    const d = data.decision;
    const decision =
      d === "valide" || d === "echec" || d === "a_refaire" ? d : undefined;

    const manip = await ManipulationModel.findOneAndUpdate(
      { _id: manipId, "etudiantsInscrits.etudiant": sid },
      {
        $set: {
          "etudiantsInscrits.$.score": Number.isFinite(data.score) ? data.score : 0,
          ...(observations ? { "etudiantsInscrits.$.observations": observations } : {}),
          ...(decision ? { "etudiantsInscrits.$.decision": decision } : {}),
          "etudiantsInscrits.$.status": "corrige",
        },
      },
      { new: true }
    );
    if (manip?.laboratoire) {
      revalidatePath(`/dashboard/laboratoires/${manip.laboratoire}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLaboratoireDepartments(id: string, departements: any[]) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findByIdAndUpdate(id, { departements }, { new: true });
    revalidatePath(`/dashboard/laboratoires/${id}`);
    revalidatePath(`/laboratoires/${labo?.slug}`);
    return { success: true, data: JSON.parse(JSON.stringify(labo)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLaboratoireBasicInfo(id: string, data: { nom: string; slug: string }) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findByIdAndUpdate(id, data, { new: true });
    revalidatePath(`/dashboard/laboratoires/${id}`);
    revalidatePath("/dashboard/laboratoires");
    revalidatePath(`/laboratoires/${labo?.slug}`);
    return { success: true, data: JSON.parse(JSON.stringify(labo)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignTechnicien(laboId: string, agentId: string, fonction: "admin" | "moderateur") {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findByIdAndUpdate(
      laboId,
      {
        $push: { techniciens: { agent: agentId, fonction } },
      },
      { new: true }
    );
    revalidatePath(`/dashboard/laboratoires/${laboId}`);
    return { success: true, data: JSON.parse(JSON.stringify(labo)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeTechnicien(laboId: string, agentId: string) {
  try {
    await connectDB();
    const labo = await LaboratoireModel.findByIdAndUpdate(
      laboId,
      {
        $pull: { techniciens: { agent: agentId } },
      },
      { new: true }
    );
    revalidatePath(`/dashboard/laboratoires/${laboId}`);
    return { success: true, data: JSON.parse(JSON.stringify(labo)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
