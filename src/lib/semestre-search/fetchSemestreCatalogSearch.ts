export type SemestreCatalogPick = {
  id: string;
  filiereId: string;
  designation: string;
  credits?: number;
  description: { title: string; contenu: string }[];
  filiereLabel: string;
  filiereSlug: string;
  order: number;
};

export type FetchSemestreCatalogOptions = {
  limit?: number;
  signal?: AbortSignal;
};

export async function fetchSemestreCatalogSearch(
  sectionId: string,
  search: string,
  options: FetchSemestreCatalogOptions = {}
): Promise<SemestreCatalogPick[]> {
  const { limit = 12, signal } = options;
  const params = new URLSearchParams();
  params.set("search", search);
  params.set("limit", String(limit));
  const res = await fetch(`/api/sections/${encodeURIComponent(sectionId)}/semestres-catalog?${params}`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    const msg =
      typeof err.message === "string" ? err.message : `Erreur ${res.status} lors de la recherche`;
    throw new Error(msg);
  }
  const json = (await res.json()) as { data?: SemestreCatalogPick[] };
  return json.data ?? [];
}
