import mongoose, { Schema, Types } from "mongoose";

export type TicketDoc = {
  _id: Types.ObjectId;
  objet: string;
  message: string;
  nomComplet: string;
  email: string;
  telephone: string;
  chats: {
    author: boolean;
    message: string;
    assets: string[];
  }[]
  status: 'pending' | 'en_cours' | 'resolu' | 'ferme';
  createdAt: Date;
  updatedAt: Date;
};

