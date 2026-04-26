/**
 * Origine publique (site) pour construire des liens absolus dans les e-mails.
 * `originOverride` : typiquement `new URL(request.url).origin` depuis une route API.
 */
export function resolvePublicOrigin(override?: string | null): string {
  const o = override?.trim();
  if (o) {
    return o.replace(/\/+$/, "");
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "";
}

/**
 * Lien public absolu vers la page conversation du ticket.
 */
export function buildTicketChatUrl(reference: string, originOverride?: string | null): string {
  const base = resolvePublicOrigin(originOverride);
  const path = `/ticket/${encodeURIComponent(reference)}`;
  if (base) {
    return `${base}${path}`;
  }
  return path;
}
