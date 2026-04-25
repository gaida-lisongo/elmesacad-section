import crypto from "crypto";

export function generateApiKey(): string {
  return `pk_${crypto.randomBytes(16).toString("hex")}`;
}

export function generateSecretKey(): string {
  return `sk_${crypto.randomBytes(32).toString("hex")}`;
}
