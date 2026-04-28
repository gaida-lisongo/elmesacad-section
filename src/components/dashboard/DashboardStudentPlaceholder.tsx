"use client";

export function DashboardStudentPlaceholder() {
  return (
    <article
      className="animate-dashboard-in rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-gray-600 dark:bg-gray-900/40"
      style={{ animationDelay: "160ms" }}
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Les statistiques et raccourcis de votre parcours étudiant seront regroupés ici.
      </p>
    </article>
  );
}
