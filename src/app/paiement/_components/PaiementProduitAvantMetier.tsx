"use client";

import type {
  PaiementProduitDetailRecord,
  PaiementProduitHydration,
} from "@/app/paiement/_components/commandeResumePayload";

type Props = {
  produit: PaiementProduitHydration | null;
  produitDetail: PaiementProduitDetailRecord | null;
  produitError?: string;
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function idLabel(v: unknown): string {
  const o = pickObject(v);
  if (o && "$oid" in o) return String(o.$oid ?? "");
  return String(v ?? "").trim();
}

function textBlock(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "";
}

type DescSection = { title: string; lines: string[] };

function parseDescriptionBlocks(raw: unknown): DescSection[] {
  if (!Array.isArray(raw)) return [];
  const out: DescSection[] = [];
  for (const item of raw) {
    const o = pickObject(item);
    if (!o) continue;
    const title = String(o.title ?? "").trim();
    const contenu = o.contenu;
    const lines: string[] = [];
    if (Array.isArray(contenu)) {
      for (const line of contenu) lines.push(String(line ?? "").trim());
    } else if (contenu != null) {
      lines.push(String(contenu).trim());
    }
    if (title || lines.some(Boolean)) out.push({ title: title || "Détail", lines: lines.filter(Boolean) });
  }
  return out;
}

function ResourceRichView({ detail }: { detail: PaiementProduitDetailRecord }) {
  const prog = pickObject(detail.programme);
  const annee = pickObject(detail.annee);
  const branding = pickObject(detail.branding);
  const designation = String(detail.designation ?? "").trim();
  const categorie = String(detail.categorie ?? "").trim();
  const amount = detail.amount;
  const currency = String(detail.currency ?? "").trim();
  const descBlocks = parseDescriptionBlocks(detail.description);
  const status = String(detail.status ?? "").trim();

  return (
    <div className="space-y-5 text-sm text-slate-700 dark:text-slate-200">
      <div>
        <h3 className="text-base font-semibold text-midnight_text dark:text-white">
          {designation || "Ressource"}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {categorie ? <span className="font-medium">{categorie}</span> : null}
          {categorie && status ? " · " : null}
          {status ? <span>Statut {status}</span> : null}
          {amount != null && Number.isFinite(Number(amount)) ? (
            <span>
              {" "}
              · {Number(amount)} {currency || "USD"}
            </span>
          ) : null}
        </p>
        {detail._id != null ? (
          <p className="mt-1 font-mono text-[11px] text-slate-500">Id {idLabel(detail._id)}</p>
        ) : null}
      </div>

      {prog ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/35">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Programme</p>
          <ul className="mt-2 space-y-1">
            {prog.classe != null ? (
              <li>
                <span className="text-slate-500">Classe :</span> {String(prog.classe)}
              </li>
            ) : null}
            {prog.filiere != null ? (
              <li>
                <span className="text-slate-500">Filière :</span>{" "}
                <span className="font-mono text-xs">{String(prog.filiere)}</span>
              </li>
            ) : null}
            {prog.credits != null ? (
              <li>
                <span className="text-slate-500">Crédits :</span> {String(prog.credits)}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {annee ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/35">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Année</p>
          <ul className="mt-2 space-y-1">
            {annee.debut != null || annee.fin != null ? (
              <li>
                <span className="text-slate-500">Période :</span> {String(annee.debut ?? "—")} —{" "}
                {String(annee.fin ?? "—")}
              </li>
            ) : null}
            {annee.slug != null ? (
              <li>
                <span className="text-slate-500">Slug :</span>{" "}
                <span className="font-mono text-xs">{String(annee.slug)}</span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {branding ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/35">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Institut / section
          </p>
          <ul className="mt-2 space-y-1">
            {(
              [
                ["Institut", branding.institut],
                ["Section", branding.section],
                ["Réf. section", branding.sectionRef],
                ["Chef de section", branding.chef],
                ["Contact", branding.contact],
                ["Email", branding.email],
                ["Adresse", branding.adresse],
              ] as [string, unknown][]
            )
              .filter(([, v]) => String(v ?? "").trim().length > 0)
              .map(([k, v]) => (
                <li key={k}>
                  <span className="text-slate-500">{k} :</span>{" "}
                  {k === "Adresse" ? (
                    <span className="whitespace-pre-wrap">{String(v)}</span>
                  ) : (
                    String(v)
                  )}
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {descBlocks.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Description
          </p>
          <div className="mt-2 space-y-3">
            {descBlocks.map((b, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-darklight">
                <p className="text-xs font-semibold text-midnight_text dark:text-white">{b.title}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {b.lines.map((line, j) => (
                    <li key={j} className="whitespace-pre-wrap">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ActiviteTpQcmView({
  produit,
  detail,
}: {
  produit: Extract<PaiementProduitHydration, { kind: "activite" }>;
  detail: PaiementProduitDetailRecord;
}) {
  const cat = String(detail.categorie ?? produit.categorie).trim().toUpperCase();
  const montant = detail.montant ?? detail.amount;
  const currency = String(detail.currency ?? "USD").trim();
  const noteMax = detail.note_maximale ?? detail.noteMaximale;
  const charge = detail.charge_horaire;
  const tpList = Array.isArray(detail.tp) ? detail.tp : [];
  const qcmList = Array.isArray(detail.qcm) ? detail.qcm : [];

  return (
    <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
      <div>
        <h3 className="text-base font-semibold text-midnight_text dark:text-white">Activité {cat}</h3>
        <ul className="mt-2 space-y-1 text-xs">
          <li>
            <span className="text-slate-500">Réf. :</span>{" "}
            <span className="font-mono">{produit.id}</span>
          </li>
          {charge != null ? (
            <li>
              <span className="text-slate-500">Charge horaire :</span>{" "}
              <span className="font-mono text-[11px]">{idLabel(charge)}</span>
            </li>
          ) : null}
          {noteMax != null ? (
            <li>
              <span className="text-slate-500">Note max. :</span> {String(noteMax)}
            </li>
          ) : null}
          {montant != null ? (
            <li>
              <span className="text-slate-500">Montant :</span> {String(montant)} {currency}
            </li>
          ) : null}
          <li>
            <span className="text-slate-500">Statut activité :</span> {textBlock(detail.status) || produit.status || "—"}
          </li>
        </ul>
      </div>

      {cat === "TP" && tpList.length > 0
        ? tpList.map((raw, idx) => {
            const row = pickObject(raw);
            if (!row) return null;
            const enonce = String(row.enonce ?? "").trim();
            const desc = parseDescriptionBlocks(row.description);
            const fichiers = Array.isArray(row.fichiers) ? row.fichiers.map((u) => String(u ?? "").trim()).filter(Boolean) : [];
            return (
              <section
                key={idx}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-darklight"
              >
                <p className="text-xs font-semibold uppercase text-slate-500">Travaux pratiques {idx + 1}</p>
                {enonce ? <p className="mt-2 whitespace-pre-wrap text-sm">{enonce}</p> : null}
                {desc.map((b, i) => (
                  <div key={i} className="mt-3">
                    <p className="text-xs font-semibold text-midnight_text dark:text-white">{b.title}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                      {b.lines.map((line, j) => (
                        <li key={j} className="whitespace-pre-wrap">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {fichiers.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-500">Fichiers</p>
                    <ul className="mt-1 space-y-1">
                      {fichiers.map((href) => (
                        <li key={href}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-xs text-primary underline"
                          >
                            {href}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })
        : null}

      {cat === "QCM" && qcmList.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-darklight">
          <p className="text-xs font-semibold text-slate-500">{qcmList.length} question(s) QCM</p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Le questionnaire se poursuit dans la zone métier ci-dessous.
          </p>
        </section>
      ) : cat === "QCM" ? (
        <p className="text-xs text-slate-500">Aucune question QCM jointe dans le détail chargé.</p>
      ) : null}

      {cat === "TP" && tpList.length === 0 ? (
        <p className="text-xs text-slate-500">Aucun TP structuré dans le détail chargé.</p>
      ) : null}
    </div>
  );
}

/**
 * Présentation riche du produit payé (ressource catalogue ou activité TP/QCM) avant le routage métier.
 */
export default function PaiementProduitAvantMetier({ produit, produitDetail, produitError }: Props) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Produit concerné</p>

      {produitError ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {produitError}
        </p>
      ) : null}

      <div className="mt-4">
        {!produit && !produitDetail ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Aucun détail produit disponible.</p>
        ) : produit?.kind === "ressource" && produitDetail ? (
          <ResourceRichView detail={produitDetail} />
        ) : produit?.kind === "ressource" ? (
          <div className="text-sm">
            <h3 className="font-semibold text-midnight_text dark:text-white">{produit.designation}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {produit.categorie} · {produit.amount} {produit.currency}
            </p>
            <p className="mt-2 text-xs text-slate-500">Détail catalogue non joint (réseau ou fallback partiel).</p>
          </div>
        ) : produit?.kind === "activite" && produitDetail ? (
          <ActiviteTpQcmView produit={produit} detail={produitDetail} />
        ) : produit?.kind === "activite" ? (
          <div className="text-sm">
            <h3 className="font-semibold text-midnight_text dark:text-white">
              Activité {produit.categorie}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-500">{produit.id}</p>
            <p className="mt-2 text-xs text-slate-500">Détail activité non joint.</p>
          </div>
        ) : produitDetail ? (
          <ResourceRichView detail={produitDetail} />
        ) : null}
      </div>
    </div>
  );
}
