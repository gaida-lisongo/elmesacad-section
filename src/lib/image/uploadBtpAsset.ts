/**
 * Appel serveur au edge function Supabase (upload-btp-assets).
 * Variables : IMAGE_SERVICE (URL), IMAGE_SERVICE_AUTH_TOKEN.
 */
export type UploadBtpResult = {
  /** URL publique ou chemin à stocker en base */
  publicUrl: string;
  raw?: unknown;
};

function pickUrlFromJson(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const o = data as Record<string, unknown>;
  const candidates = [o.url, o.publicUrl, o.path, o.fileUrl];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) {
      return c;
    }
  }
  const nested = o.data;
  if (nested && typeof nested === "object") {
    const d = nested as Record<string, unknown>;
    const u = d.url ?? d.publicUrl;
    if (typeof u === "string") {
      return u;
    }
  }
  return null;
}

export async function uploadBtpAsset(options: {
  file: Blob;
  filename: string;
  schema?: string;
}): Promise<UploadBtpResult> {
  const base = process.env.IMAGE_SERVICE?.replace(/\/+$/, "");
  const token = process.env.IMAGE_SERVICE_AUTH_TOKEN;
  if (!base || !token) {
    throw new Error("IMAGE_SERVICE ou IMAGE_SERVICE_AUTH_TOKEN manquant");
  }

  const schema = options.schema ?? process.env.IMAGE_UPLOAD_SCHEMA ?? "profiles";

  const fd = new FormData();
  fd.set("schema", schema);
  fd.set("filename", options.filename);
  fd.append("file", options.file, options.filename);

  const res = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
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
    throw new Error("Réponse upload sans URL exploitable. Corps : " + text.slice(0, 200));
  }

  return { publicUrl, raw: data };
}
