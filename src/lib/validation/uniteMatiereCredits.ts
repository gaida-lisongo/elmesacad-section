import { Types } from "mongoose";
import { MatiereModel } from "@/lib/models/Matiere";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { creditsMatiereDepasseUnite } from "@/lib/validation/creditsCoherence";

/** Somme des crédits des matières rattachées à l’unité (option : exclure une matière, ex. lors d’un PATCH). */
export async function sumCreditsMatieresPourUnite(
  uniteId: Types.ObjectId,
  options?: { exclureMatiereId?: Types.ObjectId }
): Promise<number> {
  const docs = await MatiereModel.find({ unite: uniteId }).select({ credits: 1, _id: 1 }).lean();
  const excl = options?.exclureMatiereId;
  let sum = 0;
  for (const d of docs) {
    if (excl && excl.equals(d._id as Types.ObjectId)) continue;
    sum += Number(d.credits) || 0;
  }
  return sum;
}

export type CreditsCoherenceKo = {
  ok: false;
  message: string;
  creditsUnite: number;
  sommeMatiereActuelle: number;
};

export type CreditsCoherenceOk = { ok: true };

/** Vérifie que l’ajout de `creditsAAjouter` (une ou plusieurs matières) ne dépasse pas le plafond UE. */
export async function verifierAjoutCreditsMatiere(
  uniteId: Types.ObjectId,
  creditsAAjouter: number
): Promise<CreditsCoherenceOk | CreditsCoherenceKo> {
  const unite = await UniteEnseignementModel.findById(uniteId).select("credits").lean();
  if (!unite) {
    return {
      ok: false,
      message: "Unité introuvable.",
      creditsUnite: 0,
      sommeMatiereActuelle: 0,
    };
  }
  const cap = Number(unite.credits);
  const actuel = await sumCreditsMatieresPourUnite(uniteId);
  const apres = actuel + creditsAAjouter;
  if (creditsMatiereDepasseUnite(cap, apres)) {
    return {
      ok: false,
      message: `Total des matières (${apres} cr.) dépasse les crédits de l’unité (${cap} cr.). Réduisez les cours ou augmentez l’unité.`,
      creditsUnite: cap,
      sommeMatiereActuelle: actuel,
    };
  }
  return { ok: true };
}

/** Après modification d’une matière (même unité ou changement d’unité) : autres matières de l’unité cible + crédits finaux de cette matière. */
export async function verifierMatiereDansUnite(args: {
  uniteCibleId: Types.ObjectId;
  matiereId: Types.ObjectId;
  creditsFinaux: number;
}): Promise<CreditsCoherenceOk | CreditsCoherenceKo> {
  const unite = await UniteEnseignementModel.findById(args.uniteCibleId).select("credits").lean();
  if (!unite) {
    return {
      ok: false,
      message: "Unité cible introuvable.",
      creditsUnite: 0,
      sommeMatiereActuelle: 0,
    };
  }
  const cap = Number(unite.credits);
  const autres = await sumCreditsMatieresPourUnite(args.uniteCibleId, { exclureMatiereId: args.matiereId });
  const apres = autres + args.creditsFinaux;
  if (creditsMatiereDepasseUnite(cap, apres)) {
    return {
      ok: false,
      message: `Incohérence : ${apres} cr. (matières) pour une unité à ${cap} cr. Ajustez les crédits des cours ou de l’unité.`,
      creditsUnite: cap,
      sommeMatiereActuelle: autres,
    };
  }
  return { ok: true };
}

/** Baisse (ou fixe) les crédits de l’unité : la somme des matières ne doit pas dépasser le nouveau plafond. */
export async function verifierNouveauxCreditsUnite(args: {
  uniteId: Types.ObjectId;
  nouveauxCreditsUnite: number;
}): Promise<CreditsCoherenceOk | CreditsCoherenceKo> {
  const unite = await UniteEnseignementModel.findById(args.uniteId).select("credits").lean();
  if (!unite) {
    return {
      ok: false,
      message: "Unité introuvable.",
      creditsUnite: 0,
      sommeMatiereActuelle: 0,
    };
  }
  const somme = await sumCreditsMatieresPourUnite(args.uniteId);
  if (creditsMatiereDepasseUnite(args.nouveauxCreditsUnite, somme)) {
    return {
      ok: false,
      message: `Les matières totalisent ${somme} cr. : impossible de fixer l’unité à ${args.nouveauxCreditsUnite} cr.`,
      creditsUnite: args.nouveauxCreditsUnite,
      sommeMatiereActuelle: somme,
    };
  }
  return { ok: true };
}
