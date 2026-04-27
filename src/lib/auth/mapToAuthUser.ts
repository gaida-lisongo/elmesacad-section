import type { UserType, UserByEmailResult, AgentWithAuthorizations } from "@/lib/services/UserManager";
import type { Agent, Student } from "@/lib/models/User";
import type { AuthAgentAuthorization, AuthUser, AuthUserAgent, AuthUserStudent } from "./types";

const DEFAULT_PHOTO = "/images/user.jpg";

const AGENT_ROLE_LABELS: Record<string, string> = {
  organisateur: "Organisateur",
  gestionnaire: "Gestionnaire",
  titulaire: "Titulaire",
  admin: "Administrateur",
};

function formatRoleLabel(role: string): string {
  return AGENT_ROLE_LABELS[role] ?? role;
}

function idFromDoc(u: { _id?: { toString: () => string } | string }): string {
  const id = u._id;
  if (id == null) {
    return "";
  }
  return typeof id === "string" ? id : id.toString();
}

function mapAgentAuthorizations(user: UserByEmailResult): AuthAgentAuthorization[] | undefined {
  if (!("authorizations" in user)) return undefined;
  const agent = user as AgentWithAuthorizations;
  const list = agent.authorizations;
  if (!list?.length) return undefined;
  return list.map((a) => ({
    id: idFromDoc(a),
    code: a.code,
    designation: a.designation,
  }));
}

/** À partir d’un document Mongo (profil vérification OTP côté API). */
export function mapDbUserToAuthUser(user: UserByEmailResult, type: UserType): AuthUser {
  if (type === "Student") {
    const s = user as Student;
    const out: AuthUserStudent = {
      kind: "student",
      id: idFromDoc(s),
      name: s.name,
      email: s.email,
      matricule: s.matricule,
      photo: s.photo || DEFAULT_PHOTO,
      cycle: s.cycle,
      accountLabel: "Étudiant",
    };
    return out;
  }

  const a = user as Agent;
  const role = a.role;
  const auths = mapAgentAuthorizations(user);
  const out: AuthUserAgent = {
    kind: "agent",
    id: idFromDoc(a),
    name: a.name,
    email: a.email,
    matricule: a.matricule,
    photo: a.photo || DEFAULT_PHOTO,
    role,
    accountLabel: formatRoleLabel(role),
    ...(auths != null ? { authorizations: auths } : {}),
  };
  return out;
}

type Raw = Record<string, unknown>;

function readId(u: Raw): string {
  const _id = u._id;
  if (_id == null) {
    return "";
  }
  if (typeof _id === "string") {
    return _id;
  }
  if (typeof _id === "object" && _id !== null && "toString" in _id) {
    return String(( _id as { toString: () => string }).toString());
  }
  return String(_id);
}

/** Réponse JSON (OTP, etc.) : objets plain sans méthode Mongoose. */
export function mapJsonUserToAuthUser(raw: unknown, accountKind: "student" | "agent"): AuthUser {
  const u = raw as Raw;
  if (accountKind === "student") {
    return {
      kind: "student",
      id: readId(u),
      name: String(u.name ?? ""),
      email: String(u.email ?? "").toLowerCase(),
      matricule: String(u.matricule ?? ""),
      photo: String(u.photo ?? DEFAULT_PHOTO),
      cycle: String(u.cycle ?? ""),
      accountLabel: "Étudiant",
    };
  }
  const role = String(u.role ?? "admin");
  const rawAuths = u.authorizations;
  let authorizations: AuthAgentAuthorization[] | undefined;
  if (Array.isArray(rawAuths) && rawAuths.length > 0) {
    authorizations = rawAuths.map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: readId(o),
        code: String(o.code ?? ""),
        designation: String(o.designation ?? ""),
      };
    });
  }
  return {
    kind: "agent",
    id: readId(u),
    name: String(u.name ?? ""),
    email: String(u.email ?? "").toLowerCase(),
    matricule: String(u.matricule ?? ""),
    photo: String(u.photo ?? DEFAULT_PHOTO),
    role,
    accountLabel: formatRoleLabel(role),
    ...(authorizations != null ? { authorizations } : {}),
  };
}
