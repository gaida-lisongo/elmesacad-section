/**
 * Statuts `Presence.status` côté microservice titulaire (enum Mongoose).
 * Fichier séparé : non importable depuis un module `"use server"` comme valeur exportée.
 */
export const TITULAIRE_PRESENCE_STATUS_ENUM = ["present", "absent", "late", "early", "excused"] as const;

export type TitulairePresenceStatus = (typeof TITULAIRE_PRESENCE_STATUS_ENUM)[number];

export const TITULAIRE_PRESENCE_STATUS_SET = new Set<string>(TITULAIRE_PRESENCE_STATUS_ENUM);
