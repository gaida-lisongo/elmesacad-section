import { notFound } from "next/navigation";
import { Types } from "mongoose";
import ChargeMatiereClient from "./ChargeMatiereClient";

type Props = { params: Promise<{ uniteId: string }> };

export default async function ChargeMatierePage({ params }: Props) {
  const { uniteId: raw } = await params;
  const uniteId = decodeURIComponent(raw ?? "").trim();
  if (!uniteId || !Types.ObjectId.isValid(uniteId)) {
    notFound();
  }

  return <ChargeMatiereClient uniteId={uniteId} />;
}
