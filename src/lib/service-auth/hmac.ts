/**
 * Identique au service auth : HMAC_SHA256(GLOBAL_SHARED_KEY, timestamp + apiKey) en hex,
 * sans séparateur entre timestamp et apiKey.
 *
 * Utilise Web Crypto (`crypto.subtle`) pour rester compatible avec le bundle Next.js
 * (instrumentation / Edge) — pas d’import du module Node `crypto`.
 */
export async function computeAuthAdminSignature(
  globalSharedKey: string,
  timestamp: string,
  apiKey: string
): Promise<string> {
  const message = timestamp + apiKey;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(globalSharedKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
