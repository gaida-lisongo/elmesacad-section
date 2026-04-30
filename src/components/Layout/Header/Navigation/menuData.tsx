import { HeaderItem } from "@/types/menu";

export type HeaderSectionItem = {
  label: string;
  slug: string;
};

const baseHeaderData: HeaderItem[] = [
  { label: "Accueil", href: "/" },
  { label: "Etudes", href: "/etudes", submenu: [] },
  { label: "Laboratoires", href: "/laboratoires" },
  { label: "Publications", href: "/publications" },
  { label: "Contact", href: "/contact" },
];

export function buildHeaderData(sections: HeaderSectionItem[]): HeaderItem[] {
  return baseHeaderData.map((item) => {
    if (item.label !== "Etudes") return item;
    return {
      ...item,
      submenu: sections.map((section) => ({
        label: section.label,
        href: `/etudes/${section.slug}`,
      })),
    };
  });
}

export const headerData: HeaderItem[] = buildHeaderData([]);
