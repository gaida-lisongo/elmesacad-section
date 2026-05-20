"use server";

import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { getOrganisateurChargeRechercheSection } from "@/lib/section/getOrganisateurChargeRechercheSection";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

export type JuryMemberInput = {
  presidentId: string;
  secretaireId: string;
  membreIds: string[];
};

export type JuryUpdateInput = {
  sectionSlug: string;
  cours?: JuryMemberInput;
  recherche?: JuryMemberInput;
};

export async function updateSectionJuryAction(input: JuryUpdateInput) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    throw new Error("Accès non autorisé");
  }

  const sectionCtx = await getOrganisateurChargeRechercheSection(session.sub);
  if (!sectionCtx || sectionCtx.sectionSlug !== input.sectionSlug) {
    throw new Error("Vous n'êtes pas autorisé à modifier cette section");
  }

  await connectDB();

  const updateFields: Record<string, unknown> = {};

  if (input.cours) {
    updateFields["jury.cours.president"] = Types.ObjectId.isValid(input.cours.presidentId)
      ? new Types.ObjectId(input.cours.presidentId)
      : null;
    updateFields["jury.cours.secretaire"] = Types.ObjectId.isValid(input.cours.secretaireId)
      ? new Types.ObjectId(input.cours.secretaireId)
      : null;
    updateFields["jury.cours.membres"] = input.cours.membreIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }

  if (input.recherche) {
    updateFields["jury.recherche.president"] = Types.ObjectId.isValid(input.recherche.presidentId)
      ? new Types.ObjectId(input.recherche.presidentId)
      : null;
    updateFields["jury.recherche.secretaire"] = Types.ObjectId.isValid(input.recherche.secretaireId)
      ? new Types.ObjectId(input.recherche.secretaireId)
      : null;
    updateFields["jury.recherche.membres"] = input.recherche.membreIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }

  await SectionModel.findOneAndUpdate(
    { slug: input.sectionSlug },
    { $set: updateFields },
    { new: true }
  );

  return { success: true };
}