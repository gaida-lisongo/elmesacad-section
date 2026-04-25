import type { AgentListItem, AgentRole, StudentListItem } from "@/lib/services/UserManager";

export type UserSearchKind = "agent" | "student";

export type FetchUserSearchOptions = {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
  /** Filtre agents par rôle (optionnel) */
  agentRole?: AgentRole;
  /** Filtre étudiants par cycle (optionnel) */
  studentCycle?: string;
};

export async function fetchUserSearch(
  kind: "agent",
  search: string,
  options?: FetchUserSearchOptions
): Promise<AgentListItem[]>;

export async function fetchUserSearch(
  kind: "student",
  search: string,
  options?: FetchUserSearchOptions
): Promise<StudentListItem[]>;

export async function fetchUserSearch(
  kind: UserSearchKind,
  search: string,
  options: FetchUserSearchOptions = {}
): Promise<AgentListItem[] | StudentListItem[]> {
  const { limit = 12, offset = 0, signal, agentRole, studentCycle } = options;
  const params = new URLSearchParams();
  params.set("search", search);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (kind === "agent" && agentRole) {
    params.set("role", agentRole);
  }
  if (kind === "student" && studentCycle && studentCycle !== "all") {
    params.set("cycle", studentCycle);
  }

  const path = kind === "agent" ? "/api/agent" : "/api/student";
  const res = await fetch(`${path}?${params.toString()}`, {
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    const msg =
      typeof err.message === "string" ? err.message : `Erreur ${res.status} lors de la recherche`;
    throw new Error(msg);
  }

  const json = (await res.json()) as { data?: unknown };
  return (json.data ?? []) as AgentListItem[] | StudentListItem[];
}
