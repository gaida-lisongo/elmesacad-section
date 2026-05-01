"use client";

import { useState } from "react";
import type { PublicSectionCard } from "@/actions/publicSections";
import FacultyHeader from "@/components/Etudes/FacultyHeader";
import SectionCourseSearchView from "@/components/Etudes/SectionCourseSearchView";
import SectionDetailContent from "@/components/Etudes/SectionDetailContent";
import type { EtudesCourseSearchItem } from "@/types/etudesCourse";

type Props = {
  section: PublicSectionCard;
  courses: EtudesCourseSearchItem[];
};

export default function EtudesSectionClientView({ section, courses }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"main" | "search">("main");

  const openSearchView = (query: string) => {
    setSearchQuery(query);
    setActiveView("search");
  };

  const openAllCoursesView = () => {
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
      ) : (
        <SectionDetailContent section={section} />
      )}
    </>
  );
}
