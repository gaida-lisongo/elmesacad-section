/**
 * Service gestionnaire de charges horaires (titulaires).
 * Variable d’environnement : `TITULAIRE_SERVICE` = origine sans slash final (ex. https://api.example.com).
 */
export function getTitulaireServiceBaseUrl(): string {
  const raw = process.env.TITULAIRE_SERVICE?.trim();
  if (!raw) {
    throw new Error("TITULAIRE_SERVICE n’est pas défini dans l’environnement");
  }
  return raw.replace(/\/$/, "");
}

export function titulaireUrl(path: string): string {
  const base = getTitulaireServiceBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
