import { randomBytes } from "crypto";

export function generateTicketReference(): string {
  return `TKT-${randomBytes(4).toString("hex").toUpperCase()}`;
}
