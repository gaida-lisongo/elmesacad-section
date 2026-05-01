import type { EtudesCourseSearchItem } from "@/types/etudesCourse";

const COURSE_SESSION_KEY = "etudes:courses:by-id";

type CourseSessionMap = Record<string, EtudesCourseSearchItem>;

function readCourseSessionMap(): CourseSessionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(COURSE_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CourseSessionMap;
  } catch {
    return {};
  }
}

function writeCourseSessionMap(map: CourseSessionMap): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(COURSE_SESSION_KEY, JSON.stringify(map));
}

export function saveCourseInSession(course: EtudesCourseSearchItem): void {
  const map = readCourseSessionMap();
  map[course.id] = course;
  writeCourseSessionMap(map);
}

export function readCourseFromSession(courseId: string): EtudesCourseSearchItem | null {
  const map = readCourseSessionMap();
  return map[courseId] ?? null;
}

export function removeCourseFromSession(courseId: string): void {
  const map = readCourseSessionMap();
  if (!map[courseId]) return;
  delete map[courseId];
  writeCourseSessionMap(map);
}
