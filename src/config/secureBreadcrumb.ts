/**
 * Segments du fil d’Ariane (espace sécurisé) par chemin.
 * Le premier segment est toujours « Accueil » (/) en cliquable.
 */
export const secureBreadcrumbLabels: Record<string, { label: string; href?: string }[]> = {
  "/dashboard": [{ label: "Tableau de bord" }],
  "/profile": [{ label: "Profil" }],
  "/agents": [{ label: "Agents" }],
  "/etudiants": [{ label: "Étudiants" }],
  "/sections": [{ label: "Sections" }],
  "/section/autorisations": [{ label: "Autorisations de section" }],
  "/tickets": [{ label: "Tickets" }],
};

/** Sous-chemins : prefix le plus long qui matche. */
export function resolveSecureBreadcrumb(pathname: string): { label: string; href?: string }[] {
  if (secureBreadcrumbLabels[pathname]) {
    return secureBreadcrumbLabels[pathname];
  }
  const keys = Object.keys(secureBreadcrumbLabels).sort((a, b) => b.length - a.length);
  for (const prefix of keys) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return secureBreadcrumbLabels[prefix];
    }
  }
  return [{ label: "Espace connecté" }];
}
