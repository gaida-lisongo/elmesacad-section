import type { CommandeDoc } from "@/lib/models/Commande";

export type PaiementPagePhase = "verification" | "metier" | "completed" | "unknown";

export function resolvePaiementPagePhase(status: CommandeDoc["status"] | string | undefined): PaiementPagePhase {
  const s = String(status ?? "").trim();
  if (s === "pending" || s === "failed") return "verification";
  if (s === "paid") return "metier";
  if (s === "completed") return "completed";
  return "unknown";
}
