"use client";

import { useState } from "react";
import type { PublicSectionCard } from "@/actions/publicSections";
import FacultyHeader from "@/components/Etudes/FacultyHeader";
import SectionCourseSearchView from "@/components/Etudes/SectionCourseSearchView";
import SectionDetailContent from "@/components/Etudes/SectionDetailContent";
import EtudesResourceCategoryBrowse, {
  type EtudesResourceHubKey,
} from "@/components/Etudes/EtudesResourceCategoryBrowse";
import type { EtudesSectionResourcesGrouped } from "@/lib/product/fetchEtudesSectionResourcesGrouped";
import type { ResourceProductVM } from "@/lib/product/loadProductPageData";
import type { EtudesCourseSearchItem } from "@/types/etudesCourse";

type Props = {
  section: PublicSectionCard;
  courses: EtudesCourseSearchItem[];
  resourcesGrouped: EtudesSectionResourcesGrouped;
};

function itemsForResourceFocus(
  focus: EtudesResourceHubKey,
  g: EtudesSectionResourcesGrouped
): ResourceProductVM[] {
  switch (focus) {
    case "fiches-validation":
      return g.validations;
    case "enrollements":
      return g.sessions;
    case "releves":
      return g.releves;
    case "laboratoires":
      return g.laboratoires;
    case "lettres-stage":
      return g.stages;
    case "sujets-recherche":
      return g.sujets;
    default:
      return [];
  }
}

export default function EtudesSectionClientView({ section, courses, resourcesGrouped }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"main" | "search">("main");
  const [resourceFocus, setResourceFocus] = useState<EtudesResourceHubKey | null>(null);

  const openSearchView = (query: string) => {
    setResourceFocus(null);
    setSearchQuery(query);
    setActiveView("search");
  };

  const openAllCoursesView = () => {
    setResourceFocus(null);
    setSearchQuery("");
    setActiveView("search");
  };

  return (
    <>
      <FacultyHeader
        facultyName={section.name}
        facultyTagline="Recherchez un cours au sein de cette faculte ou consultez l'ensemble des cours disponibles."
        sectionSlug={section.slug}
        onSearch={openSearchView}
        onOpenCourses={openAllCoursesView}
      />

      {activeView === "search" ? (
        <SectionCourseSearchView
          section={section}
          query={searchQuery}
          courses={courses}
          onBackToMain={() => setActiveView("main")}
        />
      ) : resourceFocus ? (
        <EtudesResourceCategoryBrowse
          section={section}
          focus={resourceFocus}
          items={itemsForResourceFocus(resourceFocus, resourcesGrouped)}
          onBack={() => setResourceFocus(null)}
        />
      ) : (
        <SectionDetailContent
          section={section}
          resourcesGrouped={resourcesGrouped}
          onOpenResourceCategory={(k) => setResourceFocus(k)}
        />
      )}
    </>
  );
}
