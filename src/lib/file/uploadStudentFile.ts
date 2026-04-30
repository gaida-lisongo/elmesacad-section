/**
 * Appel serveur au file-service (upload-student-files).
 * Variables : FILE_SERVICE (URL), FILE_SERVICE_AUTH_TOKEN.
 */
export type UploadStudentFileResult = {
  publicUrl: string;
  raw?: unknown;
};

function pickUrlFromJson(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  for (const c of [o.publicUrl, o.url, o.fileUrl, o.path]) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const nested = o.data;
  if (nested && typeof nested === "object") {
    const d = nested as Record<string, unknown>;
    for (const c of [d.publicUrl, d.url, d.fileUrl, d.path]) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }
  }
  return null;
}

export async function uploadStudentFile(options: {
  file: Blob;
  filename: string;
  schema?: string;
}): Promise<UploadStudentFileResult> {
  const base = process.env.FILE_SERVICE?.replace(/\/+$/, "");
  const token = process.env.FILE_SERVICE_AUTH_TOKEN;
  if (!base || !token) {
    throw new Error("FILE_SERVICE ou FILE_SERVICE_AUTH_TOKEN manquant");
  }

  const schema = options.schema ?? process.env.FILE_UPLOAD_SCHEMA ?? "student/resolutions";
  const fd = new FormData();
  fd.set("schema", schema);
  fd.set("filename", options.filename);
  fd.append("file", options.file, options.filename);

  const res = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Upload refusé (${res.status})`);
  }

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  const publicUrl = pickUrlFromJson(data) ?? (text.startsWith("http") ? text.trim() : null);
  if (!publicUrl) {
    throw new Error("Réponse file-service sans URL exploitable.");
  }
  return { publicUrl, raw: data };
}
