"use server";

import { uploadStudentFile } from "@/lib/file/uploadStudentFile";

function sanitizeName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_");
}

export async function uploadResolutionFiles(input: {
  files: File[];
  matricule: string;
  activiteId: string;
}): Promise<string[]> {
  const files = Array.isArray(input.files) ? input.files : [];
  if (files.length === 0) return [];

  const activiteId = String(input.activiteId ?? "").trim() || "unknown-activity";
  const matricule = String(input.matricule ?? "").trim() || "unknown-student";
  const schema = `students/${sanitizeName(matricule)}/${sanitizeName(activiteId)}`;

  const urls: string[] = [];
  for (const file of files) {
    const original = String(file.name ?? "").trim() || "piece-jointe";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(original)}`;
    const { publicUrl } = await uploadStudentFile({
      file,
      filename,
      schema,
    });
    urls.push(publicUrl);
  }
  return urls;
}
