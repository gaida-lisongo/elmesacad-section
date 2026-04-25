import { Types, type Model } from "mongoose";

/**
 * "L1 BTP" → l1-btp, then a unique 2-digit suffix: l1-btp-37
 */
export function slugifyDesignation(designation: string): string {
  const s = designation
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "item";
}

function randomTwoDigitSuffix(): string {
  return String(Math.floor(10 + Math.random() * 90)).padStart(2, "0");
}

export async function buildUniqueSlug(
  model: Model<{ slug: string }>,
  baseDesignation: string,
  matchExtra: Record<string, unknown> = {},
  excludeId?: Types.ObjectId
): Promise<string> {
  const base = slugifyDesignation(baseDesignation);
  for (let attempt = 0; attempt < 200; attempt++) {
    const suffix = randomTwoDigitSuffix();
    const candidate = `${base}-${suffix}`;
    const exists = await model.exists({
      ...matchExtra,
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}
