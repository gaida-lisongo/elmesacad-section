/**
 * Aligné sur le schéma commande « sujet » côté service étudiant (OrderSujetSchema).
 * Les champs note / validation / observations sont renseignés par l’administration.
 */

export type OrderSujetSection = {
  title: string;
  contenu: string[];
};

export type OrderSujetStudentPayload = {
  titre: string;
  directeur: string;
  co_directeur: string;
  thematique: string;
  justification: string[];
  problematique: string[];
  objectif: string[];
  methodologie: OrderSujetSection[];
  resultats_attendus: OrderSujetSection[];
  chronogrammes: OrderSujetSection[];
  references: OrderSujetSection[];
};

export type OrderSujetAdminFields = {
  note: number | null;
  validation: boolean | null;
  observations: unknown;
};

export function multilineToStringArray(raw: string): string[] {
  const lines = String(raw ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.length > 0 ? lines : [];
}

export function stringArrayToMultiline(lines: string[]): string {
  return (lines ?? []).map((l) => String(l).trim()).filter(Boolean).join("\n");
}

export function emptySection(): OrderSujetSection {
  return { title: "", contenu: [""] };
}

export function normalizeSectionsForApi(sections: OrderSujetSection[]): OrderSujetSection[] {
  return sections
    .map((s) => ({
      title: String(s.title ?? "").trim() || "Section",
      contenu: (Array.isArray(s.contenu) ? s.contenu : [])
        .map((c) => String(c ?? "").trim())
        .filter((c) => c.length > 0),
    }))
    .filter((s) => s.contenu.length > 0);
}

export function ensureSectionsOrDefault(sections: OrderSujetSection[], defaultTitle: string): OrderSujetSection[] {
  const n = normalizeSectionsForApi(sections);
  if (n.length > 0) return n;
  return [{ title: defaultTitle, contenu: ["—"] }];
}
