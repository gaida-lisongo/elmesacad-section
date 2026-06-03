import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { connectDB } from "@/lib/services/connectedDB";
import { notFound } from "next/navigation";
import ProgrammeClient from "../_components/ProgrammeClient";
import Breadcrumb from "@/components/Common/Breadcrumb";

import { ObjectId } from 'mongoose';

export interface IDescription {
  title: string;
  contenu: string;
}

export interface ISemestre {
  _id: ObjectId | string;
  designation: string;
  credits: number;
  order: number;
  unites: any[]; // À affiner si tu as la structure des unités
  filiere: Record<string, any>;
  description: any[];
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface IGestionnaires {
  operateurSaisie: ObjectId | string;
  appariteur: ObjectId | string;
}

export interface IBureau {
  chefSection: ObjectId | string;
  chargeEnseignement: ObjectId | string;
  chargeRecherche: ObjectId | string;
  secretaire: ObjectId | string;
}

export interface ISection {
  _id: ObjectId | string;
  designation: string;
  logo: string;
  slug: string;
  email: string;
  website: string;
  telephone: string;
  description: IDescription[] | any[];
  apiKey: string;
  secretKey: string;
  programmes: (ObjectId | string)[];
  bureau: IBureau;
  cycle: 'Licence' | 'Master' | 'Doctorat';
  gestionnaires: IGestionnaires;
  jury: {
    cours: Record<string, any>;
    recherche: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface IProgramme {
  _id: ObjectId | string;
  designation: string; // Ex: 'L2 CIB'
  slug: string;
  credits: number;
  description: IDescription[];
  section: ISection;
  semestres: ISemestre[];
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export default async function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!slug?.trim()) {
        notFound();
    }

    await connectDB();
    const programme = await ProgrammeModel
    .findOne({ slug })
    .populate("section")
    .populate([
        {
            path: "semestres",
            model: SemestreModel,
            populate: [
                {
                    path: 'filiere',
                    model: 'Filiere',
                },
                {
                    path: 'unites',
                    model: UniteEnseignementModel,
                }
            ]
        }
    ])
    // .populate("semestres.filiere")
    .lean();

    if (!programme) {
        notFound();
    }

    // Correction de la sérialisation :
    const serializedProgramme = JSON.parse(JSON.stringify(programme));

    console.log("Programme:", serializedProgramme);

    return (
        <>
            <Breadcrumb pageName={serializedProgramme.designation} pageDescription={''} />
            <ProgrammeClient programme={serializedProgramme} />
        </>
    )
}