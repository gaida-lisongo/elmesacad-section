const OID_HEX_24 = /^[a-f0-9]{24}$/i;

/**
 * Normalise un identifiant MongoDB 24 hex (ObjectId).
 * Gère trim, guillemets, et un caractère parasite souvent collé par certains lecteurs QR.
 */
export function normalizeMongoObjectIdString(raw: string): string | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  s = s.replace(/^["']+|["']+$/g, "").trim().toLowerCase();
  if (OID_HEX_24.test(s)) return s;
  const m = s.match(/([a-f0-9]{24})/i);
  if (m && OID_HEX_24.test(m[1])) return m[1].toLowerCase();
  return null;
}
