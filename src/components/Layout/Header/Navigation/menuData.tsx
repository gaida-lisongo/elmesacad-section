import { HeaderItem } from "@/types/menu";

export type HeaderSectionItem = {
  label: string;
  slug: string;
};

export type HeaderLaboratoireItem = {
  label: string;
  slug: string;
};

const baseHeaderData: HeaderItem[] = [
  { label: "Accueil", href: "/" },
  { label: "Etudes", href: "/etudes", submenu: [] },
  { label: "Laboratoires", href: "/laboratoires", submenu: [] },
  { label: "Publications", href: "/publications" },
  { label: "Contact", href: "/contact" },
];

export function buildHeaderData(
  sections: HeaderSectionItem[],
  laboratoires: HeaderLaboratoireItem[] = []
): HeaderItem[] {
  return baseHeaderData.map((item) => {
    if (item.label === "Etudes") {
      return {
        ...item,
        submenu: sections.map((section) => ({
          label: section.label,
          href: `/etudes/${section.slug}`,
        })),
      };
    }
    if (item.label === "Laboratoires") {
      return {
        ...item,
        submenu: laboratoires.map((labo) => ({
          label: labo.label,
          href: `/laboratoires/${labo.slug}`,
        })),
      };
    }
    return item;
  });
}

export const headerData: HeaderItem[] = buildHeaderData([], []);
