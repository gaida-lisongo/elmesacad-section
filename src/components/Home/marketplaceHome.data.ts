import type { PublicHeroActivity } from "@/actions/titulaireActivites";

export type ActivitySlide = PublicHeroActivity;

export type Faculty = {
  id: string;
  name: string;
  theme: string;
  description: string;
  highlights: string[];
};

export type HowItWorks = {
  id: string;
  title: string;
  text: string;
  icon: string;
};

export const mockActivitySlides: ActivitySlide[] = [
  {
    id: "a1",
    title: "Debloque ton potentiel academique, une ressource a la fois",
    summary: "Activites, supports et exercices publies par les enseignants de ta section.",
    teacher: "Prof. Kankenza",
    badge: "Nouveau",
    categorie: "tp",
    matiere: "Analyse de texte",
    unite: "Francais I",
    promotion: "L1 CIB",
    chargeHoraireId: "69f0b22ed1e641dd09aee414",
    noteMaximale: 20,
    publishedAt: "2026-04-30T06:46:43.740Z",
  },
  {
    id: "a2",
    title: "Serie d'exercices de mecanique des fluides",
    summary: "Decouvre les nouvelles publications pedagogiques de la semaine.",
    teacher: "Mme Mukendi",
    badge: "Populaire",
    categorie: "qcm",
    matiere: "Mecanique des fluides",
    unite: "Hydraulique",
    promotion: "L2 GC",
    chargeHoraireId: "69f0b22ed1e641dd09aee415",
    noteMaximale: 20,
    publishedAt: "2026-04-29T10:22:00.000Z",
  },
  {
    id: "a3",
    title: "TD d'electrotechnique + evaluation continue",
    summary: "Commande des packs de cours et activites adaptes a ton parcours.",
    teacher: "M. Kasongo",
    badge: "A la une",
    categorie: "tp",
    matiere: "Electrotechnique",
    unite: "Circuits I",
    promotion: "L3 Energie",
    chargeHoraireId: "69f0b22ed1e641dd09aee416",
    noteMaximale: 20,
    publishedAt: "2026-04-28T09:15:00.000Z",
  },
];

export const faculties: Faculty[] = [
  {
    id: "genie-civil",
    name: "Genie Civil",
    theme: "from-sky-500/20 to-cyan-500/20",
    description: "Structures, hydraulique et conception des ouvrages.",
    highlights: ["84 ressources", "23 activites", "11 enseignants actifs"],
  },
  {
    id: "informatique",
    name: "Informatique",
    theme: "from-indigo-500/20 to-violet-500/20",
    description: "Developpement logiciel, IA, bases de donnees et reseaux.",
    highlights: ["112 ressources", "31 activites", "16 enseignants actifs"],
  },
  {
    id: "telecom",
    name: "Telecommunications",
    theme: "from-fuchsia-500/20 to-pink-500/20",
    description: "Reseaux, transmission numerique et infrastructures telecom.",
    highlights: ["67 ressources", "19 activites", "8 enseignants actifs"],
  },
  {
    id: "energie",
    name: "Energie",
    theme: "from-amber-500/20 to-orange-500/20",
    description: "Electrique, energetique industrielle et systemes embarques.",
    highlights: ["76 ressources", "22 activites", "9 enseignants actifs"],
  },
];

export const howItWorks: HowItWorks[] = [
  { id: "find", title: "Trouver", text: "Recherche par faculte, matiere et niveau.", icon: "🔎" },
  { id: "book", title: "Commander", text: "Ajoute les ressources et valide ta commande.", icon: "🧾" },
  { id: "learn", title: "Apprendre", text: "Accede au contenu et aux activites publiees.", icon: "💡" },
];
