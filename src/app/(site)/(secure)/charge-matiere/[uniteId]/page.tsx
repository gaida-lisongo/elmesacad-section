import { notFound } from "next/navigation";
import { Types } from "mongoose";
import ChargeMatiereClient from "./ChargeMatiereClient";

type Props = { params: Promise<{ uniteId: string }> };

export default async function ChargeMatierePage({ params }: Props) {
  const { uniteId: raw } = await params;
  const composite = decodeURIComponent(raw ?? "").trim();
  const [programmeId = "", uniteId = ""] = composite.split("_");

  if (!programmeId || !uniteId || !Types.ObjectId.isValid(programmeId) || !Types.ObjectId.isValid(uniteId)) {
    notFound();
  }

  return <ChargeMatiereClient programmeId={programmeId} uniteId={uniteId} />;
}
