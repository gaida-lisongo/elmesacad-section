export interface BreadcrumbProps {
  pageName: string;
  pageDescription?: string;
  /** Segments entre « Accueil » et le titre courant (`pageName`). Sans `href`, affiché en texte seul. */
  trail?: { label: string; href?: string }[];
}

export interface BreadcrumbLink {
  href: string;
  text: string;
}