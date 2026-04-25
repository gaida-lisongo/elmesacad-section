import { Types } from "mongoose";

export function parseObjectIdArray(value: unknown): Types.ObjectId[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string" && Types.ObjectId.isValid(x))
    .map((x) => new Types.ObjectId(x));
}
