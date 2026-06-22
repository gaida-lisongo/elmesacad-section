import mongoose, { Schema, Types, Document } from "mongoose";

export interface ReponseQCM {
  question: string;
  propositions: string[];
  bonneReponse: number;
  reponseParticipant: number;
  estCorrecte: boolean;
  pointsObtenus: number;
}

export interface ParticipantDoc extends Document {
  formation: Types.ObjectId;
  user: Types.ObjectId;

  reponses: ReponseQCM[];

  note: number;
  score: number;
  mention:
    | "Excellent"
    | "Très Bien"
    | "Bien"
    | "Assez Bien"
    | "Passable";

  observations?: string;

  completedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

const reponseSchema = new Schema<ReponseQCM>(
  {
    question: {
      type: String,
      required: true,
    },

    propositions: [
      {
        type: String,
        required: true,
      },
    ],

    bonneReponse: {
      type: Number,
      required: true,
    },

    reponseParticipant: {
      type: Number,
      required: true,
    },

    estCorrecte: {
      type: Boolean,
      required: true,
    },

    pointsObtenus: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const participantSchema = new Schema<ParticipantDoc>(
  {
    formation: {
      type: Schema.Types.ObjectId,
      ref: "Formation",
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reponses: [reponseSchema],

    score: {
      type: Number,
      default: 0,
    },

    note: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
    },

    mention: {
      type: String,
      enum: [
        "Excellent",
        "Très Bien",
        "Bien",
        "Assez Bien",
        "Passable",
      ],
      default: "Passable",
    },

    observations: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ParticipantModel =
  (mongoose.models.Participant as mongoose.Model<ParticipantDoc>) ||
  mongoose.model<ParticipantDoc>(
    "Participant",
    participantSchema
  );