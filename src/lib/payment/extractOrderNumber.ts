/**
 * Le fournisseur renvoie souvent { data: { data: { orderNumber, code, message } } }.
 * On parcourt la chaîne de clés `data` et on lit `orderNumber` dès qu’il apparaît.
 */
export function extractOrderNumberFromProviderPayload(value: unknown): string | null {
  let current: unknown = value;
  for (let i = 0; i < 10; i++) {
    if (current == null) {
      return null;
    }
    if (typeof current !== "object") {
      return null;
    }
    const o = current as Record<string, unknown>;
    if (typeof o.orderNumber === "string" && o.orderNumber.length > 0) {
      return o.orderNumber;
    }
    if ("data" in o && o.data != null) {
      current = o.data;
      continue;
    }
    return null;
  }
  return null;
}
