import { SessionPayload, getSessionPayload, isAgentSession } from "./sessionServer";
import { Types } from "mongoose";

/**
 * Vérifie si l'utilisateur connecté est un technicien du laboratoire donné.
 * Un utilisateur est considéré comme technicien s'il est dans la liste techniciens.agent du labo.
 */
export async function isUserTechnicien(labo: { techniciens: Array<{ agent: { _id: string | Types.ObjectId } }> }): Promise<boolean> {
  const session = await getSessionPayload();
  if (!isAgentSession(session)) {
    return false;
  }

  if (!labo?.techniciens?.length) {
    return false;
  }

  const userId = session.sub;
  return labo.techniciens.some((t) => {
    const agentId = t.agent._id;
    const agentIdStr = typeof agentId === 'string' ? agentId : String(agentId);
    return agentIdStr === userId;
  });
}

/**
 * Vérifie si l'utilisateur connecté a une autorisation spécifique (code d'autorisation).
 */
export async function hasAuthorizationCode(code: string): Promise<boolean> {
  const session = await getSessionPayload();
  if (!isAgentSession(session)) {
    return false;
  }

  // Pour l'instant, on vérifie juste la session.
  // Pour vérifier les autorisations en base, il faudrait fetcher depuis AuthorizationModel
  // ou avoir les authorizations dans la session (ce qui n'est pas le cas actuellement).
  // Cette fonction peut être étendue plus tard.
  return false;
}

/**
 * Vérifie si l'utilisateur connecté peut éditer un laboratoire.
 * Actuellement : admin ou technicien du labo.
 */
export async function canEditLaboratoire(labo: { techniciens: Array<{ agent: { _id: string | Types.ObjectId } }> }): Promise<boolean> {
  const session = await getSessionPayload();
  if (!isAgentSession(session)) {
    return false;
  }

  // Admin peut tout éditer
  if (session.role === 'admin') {
    return true;
  }

  // Vérifier si l'utilisateur est technicien de ce labo
  return isUserTechnicien(labo);
}

/**
 * Retourne la fonction du technicien pour ce laboratoire, ou null.
 */
export async function getUserTechnicienFonction(labo: { techniciens: Array<{ agent: { _id: string | Types.ObjectId }; fonction: string }> }): Promise<string | null> {
  const session = await getSessionPayload();
  if (!isAgentSession(session)) {
    return null;
  }

  if (!labo?.techniciens?.length) {
    return null;
  }

  const userId = session.sub;
  const tech = labo.techniciens.find((t) => {
    const agentId = t.agent._id;
    const agentIdStr = typeof agentId === 'string' ? agentId : String(agentId);
    return agentIdStr === userId;
  });

  return tech?.fonction || null;
}
