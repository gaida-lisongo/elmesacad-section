import mongoose, { Schema, Types, Document } from "mongoose";

export interface PostDoc extends Document {
  sujet: string;
  photos: string[];
  problematique: string;
  methodology: string;
  public: boolean;
  montant: number;
  laboratoire: Types.ObjectId;
  commandes: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const postSchema = new Schema<PostDoc>(
  {
    sujet: { type: String, required: true },
    photos: [{ type: String }],
    problematique: { type: String, required: true },
    methodology: { type: String, required: true },
    public: { type: Boolean, default: false },
    montant: { type: Number, required: true },
    laboratoire: { type: Schema.Types.ObjectId, ref: "Laboratoire", required: true },
    commandes: [{ type: Schema.Types.ObjectId, ref: "Commande" }],
  },
  { timestamps: true }
);

export const PostModel =
  (mongoose.models.Post as mongoose.Model<PostDoc>) ||
  mongoose.model<PostDoc>("Post", postSchema);
