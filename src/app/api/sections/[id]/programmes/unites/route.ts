import { NextResponse } from "next/server";
import { Types, type PipelineStage } from "mongoose";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { connectDB } from "@/lib/services/connectedDB";

type RouteContext = { params: Promise<{ id: string }> };

type UniteProgrammeRow = {
  uniteId: string;
  uniteDesignation: string;
  uniteCode: string;
  credits: number;
  semestreDesignation: string;
  matieresCount: number;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    // Kept for route contract; request logic depends only on programmeId.
    await context.params;

    const url = new URL(request.url);
    const programmeId = url.searchParams.get("programmeId");
    if (!programmeId || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "programmeId is required" }, { status: 400 });
    }

    await connectDB();
    const programmeOid = new Types.ObjectId(programmeId);

    // Semestre -> UE -> Matieres, grouped by programme.
    const pipeline: PipelineStage[] = [
      {
        $match: {
          programme: programmeOid,
          filiere: { $exists: false },
        },
      },
      {
        $unwind: {
          path: "$unites",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: UniteEnseignementModel.collection.name,
          localField: "unites",
          foreignField: "_id",
          as: "ue",
        },
      },
      {
        $unwind: {
          path: "$ue",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          programmeId: "$programme",
          semestreOrder: { $ifNull: ["$order", 0] },
          semestreDesignation: "$designation",
          uniteId: "$ue._id",
          uniteDesignation: "$ue.designation",
          uniteCode: "$ue.code",
          credits: { $ifNull: ["$ue.credits", 0] },
          matiereIds: { $ifNull: ["$ue.matieres", []] },
        },
      },
      {
        $lookup: {
          from: "matieres",
          let: { uniteId: "$uniteId", mIds: "$matiereIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$unite", "$$uniteId"] },
                    { $in: ["$_id", "$$mIds"] },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: "matieres",
        },
      },
      {
        $sort: {
          programmeId: 1,
          semestreOrder: 1,
          uniteDesignation: 1,
        },
      },
      {
        $group: {
          _id: "$programmeId",
          unites: {
            $push: {
              uniteId: "$uniteId",
              uniteDesignation: "$uniteDesignation",
              uniteCode: "$uniteCode",
              credits: "$credits",
              semestreDesignation: "$semestreDesignation",
              matieresCount: { $size: { $ifNull: ["$matieres", []] } },
            },
          },
        },
      },
    ];

    const grouped = (await SemestreModel.aggregate(pipeline)) as Array<{
      _id: Types.ObjectId;
      unites: Array<{
        uniteId: Types.ObjectId;
        uniteDesignation?: string;
        uniteCode?: string;
        credits?: number;
        semestreDesignation?: string;
        matieresCount?: number;
      }>;
    }>;

    const programmesMap: Record<string, UniteProgrammeRow[]> = {};
    for (const row of grouped) {
      const pid = String(row._id);
      programmesMap[pid] = (row.unites ?? []).map((u) => ({
        uniteId: String(u.uniteId),
        uniteDesignation: u.uniteDesignation ?? "",
        uniteCode: u.uniteCode ?? "",
        credits: u.credits ?? 0,
        semestreDesignation: u.semestreDesignation ?? "",
        matieresCount: u.matieresCount ?? 0,
      }));
    }

    return NextResponse.json(
      {
        data: programmesMap[String(programmeOid)] ?? [],
        programmesMap,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list programme unites", error: (error as Error).message },
      { status: 500 }
    );
  }
}
