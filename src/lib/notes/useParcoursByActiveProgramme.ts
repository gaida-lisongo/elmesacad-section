"use client";

import { useEffect, useState } from "react";
import { listParcoursForArchivage } from "@/actions/organisateurArchivage";

export type ParcoursActiveRow = {
  id: string;
  matricule: string;
  email: string;
  nomComplet: string;
  studentId: string;
  photo?: string;
  sexe?: string;
  nationalite?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  programmeClasse?: string;
  anneeSlug?: string;
};

type Params = {
  anneeSlug: string;
  sectionSlug: string;
  programmeSlug: string;
  search?: string;
};

export function useParcoursByActiveProgramme(params: Params | null) {
  const [rows, setRows] = useState<ParcoursActiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!params?.anneeSlug || !params.sectionSlug || !params.programmeSlug) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await listParcoursForArchivage({
          anneeSlug: params.anneeSlug,
          sectionSlug: params.sectionSlug,
          programmeSlug: params.programmeSlug,
          search: params.search?.trim() || undefined,
          page: 1,
          limit: 100,
        });
        const mapped = (res.data ?? []).map((raw) => {
          const x = raw as Record<string, unknown>;
          const st = (x.student ?? {}) as Record<string, unknown>;
          const programme = (x.programme ?? {}) as Record<string, unknown>;
          const annee = (x.annee ?? {}) as Record<string, unknown>;
          return {
            id: String(x._id ?? x.id ?? ""),
            matricule: String(st.matricule ?? ""),
            email: String(st.mail ?? st.email ?? ""),
            nomComplet: String(st.name ?? st.nomComplet ?? "—"),
            studentId: String(x.reference ?? ""),
            photo: String(st.photo ?? ""),
            sexe: String(st.sexe ?? ""),
            nationalite: String(st.nationalite ?? ""),
            dateNaissance: String(st.date_naissance ?? ""),
            lieuNaissance: String(st.lieu_naissance ?? ""),
            programmeClasse: String(programme.classe ?? ""),
            anneeSlug: String(annee.slug ?? ""),
          } satisfies ParcoursActiveRow;
        });
        setRows(mapped);
      } catch (e) {
        setRows([]);
        setError((e as Error).message || "Erreur de chargement des parcours.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [params?.anneeSlug, params?.sectionSlug, params?.programmeSlug, params?.search]);

  return { rows, loading, error };
}

