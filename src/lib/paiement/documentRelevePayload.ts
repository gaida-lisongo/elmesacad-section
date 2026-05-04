import type { PaiementSectionBranding } from "@/app/paiement/_components/commandeResumePayload";
import {
  mergePaiementBrandingFromContext,
  type BuildDocumentBulletinContext,
} from "@/lib/paiement/documentBulletinPayload";
import type { ConsolidatedResultDocumentPayload } from "@/lib/notes/consolidatedResultTypes";

export type ReleveUnitItem = {
  semestre: string;
  code: string;
  designation: string;
  statut: "V" | "NV";
  credit: number;
  moyenne: number;
  elements: Array<{
    designation: string;
    credit: number;
    cc: number;
    examen: number;
    noteSession: number;
    rattrapage: number;
    rachat: number;
    noteFinale: number;
  }>;
};

export type ReleveSummary = {
  ncv: number;
  ncnv: number;
  totalObtenu: number;
  totalMax: number;
  pourcentage: number;
  mention: string;
  decision: string;
};

/** Payload JSON pour `POST …/releve/generate` (service étudiant). */
export type DocumentRelevePayload = {
  studentName: string;
  studentVille: string;
  /** ISO 8601 (compatible `new Date(...)` côté service). */
  studentDateNaiss: string;
  studentEmail: string | null;
  studentPhone: string | null;
  matricule: string;
  programmeName: string;
  anneeAcad: string;
  orderReference: string;
  serialNumber: string;
  units: ReleveUnitItem[];
  summary: ReleveSummary;
  verificationUrl: string;
  branding: PaiementSectionBranding;
};

export type BuildDocumentReleveContext = BuildDocumentBulletinContext;

function trimOrEmpty(v: string | undefined | null): string {
  return String(v ?? "").trim();
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function mentionLibelle(code: string): string {
  const c = trimOrEmpty(code).toUpperCase();
  const map: Record<string, string> = {
    A: "Excellent",
    B: "Bien",
    C: "Assez bien",
    D: "Passable",
    E: "Insuffisant",
  };
  return map[c] ?? (c || "—");
}

function decisionReleveLibelle(decisionJury: string): string {
  const d = trimOrEmpty(decisionJury);
  if (d === "Passé") return "Admis";
  if (d === "Double") return "Ajourné";
  return d || "—";
}

function parseBirthIso(etudiantDate: string | null | undefined): string {
  const raw = trimOrEmpty(etudiantDate);
  if (!raw) return new Date("2000-01-01T00:00:00.000Z").toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date("2000-01-01T00:00:00.000Z").toISOString();
  return d.toISOString();
}

function verificationUrlForOrder(commandeId: string): string {
  const id = trimOrEmpty(commandeId);
  const base =
    trimOrEmpty(process.env.NEXT_PUBLIC_APP_URL) ||
    trimOrEmpty(process.env.APP_URL) ||
    (trimOrEmpty(process.env.VERCEL_URL) ? `https://${String(process.env.VERCEL_URL).replace(/^\/+/, "")}` : "") ||
    "http://localhost:3000";
  const origin = base.replace(/\/+$/, "");
  return `${origin}/api/commandes/verify/${encodeURIComponent(id || "releve")}`;
}

function serialNumberFor(commandeId: string): string {
  const clean = trimOrEmpty(commandeId).replace(/\W/g, "");
  const tail = clean.slice(-10) || "0000000000";
  const rnd = Math.random().toString(36).slice(2, 8);
  return `REL-${tail}-${rnd}`.toUpperCase();
}

/**
 * Construit le payload relevé de cotes à partir du snapshot consolidé + contexte commande / étudiant.
 */
export function buildDocumentRelevePayload(
  consolidated: ConsolidatedResultDocumentPayload,
  ctx: BuildDocumentReleveContext
): DocumentRelevePayload {
  const { commande, commandeId, etudiant } = ctx;
  const s = consolidated.student;
  const branding = mergePaiementBrandingFromContext(ctx);

  const units: ReleveUnitItem[] = [];
  let totalObtenu = 0;
  let totalMax = 0;

  for (const sem of consolidated.semestres) {
    const semLabel = trimOrEmpty(sem.designation) || trimOrEmpty(sem.semestreId) || "—";
    for (const u of sem.unites) {
      const moy = round2(u.moyenne);
      const statut: "V" | "NV" = moy >= 10 ? "V" : "NV";
      const elements = u.matieres.map((m) => {
        const noteSession = round2(m.cc + m.examen);
        const nf = round2(m.noteFinale);
        totalObtenu += nf * m.credit;
        totalMax += 20 * m.credit;
        return {
          designation: m.designation,
          credit: m.credit,
          cc: m.cc,
          examen: m.examen,
          noteSession,
          rattrapage: m.rattrapage,
          rachat: m.rachat,
          noteFinale: nf,
        };
      });
      units.push({
        semestre: semLabel,
        code: trimOrEmpty(u.code) || "—",
        designation: trimOrEmpty(u.designation) || "—",
        statut,
        credit: u.credit,
        moyenne: moy,
        elements,
      });
    }
  }

  const programmeCredits = Math.max(0, consolidated.programmeCredits || 0);
  const pctSynth = consolidated.synthese.pourcentage;
  const pctFromTotals = totalMax > 0 ? (totalObtenu / totalMax) * 100 : pctSynth;

  const summary: ReleveSummary = {
    ncv: round2(consolidated.synthese.ncv),
    ncnv: round2(consolidated.synthese.ncnv),
    totalObtenu: round2(totalObtenu),
    totalMax: round2(totalMax > 0 ? totalMax : programmeCredits * 20),
    pourcentage: round2(totalMax > 0 ? pctFromTotals : pctSynth),
    mention: mentionLibelle(consolidated.synthese.mention),
    decision: decisionReleveLibelle(consolidated.synthese.decisionJury),
  };

  const orderRef = trimOrEmpty(commandeId) || trimOrEmpty(commande.id) || "—";
  const email =
    trimOrEmpty(s?.email) || trimOrEmpty(etudiant?.email) || trimOrEmpty(commande.student?.email) || null;
  const phone = trimOrEmpty(etudiant?.telephone) || null;

  return {
    studentName: trimOrEmpty(consolidated.nomAffiche) || trimOrEmpty(s?.nomComplet) || "—",
    studentVille: trimOrEmpty(etudiant?.ville) || "—",
    studentDateNaiss: parseBirthIso(etudiant?.dateDeNaissance ?? undefined),
    studentEmail: email || null,
    studentPhone: phone,
    matricule: trimOrEmpty(s?.matricule) || trimOrEmpty(etudiant?.matricule) || "—",
    programmeName: trimOrEmpty(consolidated.programmeName) || "—",
    anneeAcad: trimOrEmpty(consolidated.anneeLabel) || trimOrEmpty(s?.anneeSlug) || "—",
    orderReference: orderRef,
    serialNumber: serialNumberFor(orderRef),
    units,
    summary,
    verificationUrl: verificationUrlForOrder(orderRef),
    branding,
  };
}
