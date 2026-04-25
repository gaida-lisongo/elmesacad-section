import React from "react";
import Breadcrumb from "@/components/Breadcrumb";

type Crumb = { href: string; text: string };

type PageDetailProps = {
  title: string;
  description?: string;
  breadcrumbs: Crumb[];
  CardDetail: React.ComponentType;
  Modal?: React.ComponentType;
  onSave?: (formData: FormData) => Promise<void> | void;
};

export default function PageDetail({
  title,
  description,
  breadcrumbs,
  CardDetail,
  Modal,
  onSave,
}: PageDetailProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <Breadcrumb links={breadcrumbs} />
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-body-color">{description}</p>}
      </header>

      {onSave ? (
        <form action={onSave} className="space-y-4">
          <CardDetail />
          <button
            type="submit"
            className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Enregistrer
          </button>
        </form>
      ) : (
        <CardDetail />
      )}

      {Modal && (
        <div className="mt-4">
          <Modal />
        </div>
      )}
    </section>
  );
}
