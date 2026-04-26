import { Types } from "mongoose";
import { TicketModel, type TicketDoc, type TicketCategorie, type TicketStatus } from "@/lib/models/Ticket";
import { generateTicketReference } from "@/lib/ticket/generateReference";
import { notifyTicketOutbound } from "@/lib/ticket/outboundWebhook";
import { sendTicketClientNotifyNewReply } from "@/lib/mail/ticketMails";

type Id = string | Types.ObjectId;

function toMsg(m: {
  _id: Types.ObjectId;
  author: boolean;
  message: string;
  assets: string[];
  createdAt?: Date;
}) {
  return {
    id: String(m._id),
    author: m.author,
    message: m.message,
    assets: m.assets ?? [],
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date(0).toISOString(),
  };
}

class TicketService {
  private static instance: TicketService;

  static getInstance(): TicketService {
    if (!TicketService.instance) TicketService.instance = new TicketService();
    return TicketService.instance;
  }

  private async uniqueReference(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const ref = generateTicketReference();
      const exists = await TicketModel.exists({ reference: ref });
      if (!exists) return ref;
    }
    throw new Error("Impossible de générer une référence unique");
  }

  async create(input: {
    objet: string;
    categorie: TicketCategorie;
    message: string;
    nomComplet: string;
    email: string;
    telephone: string;
  }): Promise<TicketDoc> {
    const reference = await this.uniqueReference();
    const email = input.email.trim().toLowerCase();
    const first = {
      _id: new Types.ObjectId(),
      author: true,
      message: input.message.trim(),
      assets: [] as string[],
      createdAt: new Date(),
    };
    const doc = await TicketModel.create({
      reference,
      objet: input.objet.trim(),
      categorie: input.categorie,
      message: input.message.trim(),
      nomComplet: input.nomComplet.trim(),
      email,
      telephone: input.telephone.trim(),
      chats: [first],
      status: "pending" as TicketStatus,
    });
    await notifyTicketOutbound({
      event: "ticket.created",
      reference: doc.reference,
      ticketId: String(doc._id),
      fromClient: true,
      message: input.message.trim(),
      createdAt: doc.createdAt?.toISOString(),
    });
    return doc;
  }

  async getByReference(reference: string): Promise<TicketDoc | null> {
    const ref = reference.trim().toUpperCase();
    return TicketModel.findOne({ reference: ref }).exec();
  }

  async getById(id: Id): Promise<TicketDoc | null> {
    if (!Types.ObjectId.isValid(String(id))) return null;
    return TicketModel.findById(id).exec();
  }

  async addMessageByReference(
    reference: string,
    input: { email: string; message: string; assets?: string[] }
  ): Promise<TicketDoc | null> {
    const ticket = await this.getByReference(reference);
    if (!ticket) return null;
    if (ticket.email !== input.email.trim().toLowerCase()) return null;
    if (ticket.status === "ferme" || ticket.status === "resolu") {
      throw new Error("Ce ticket est clos");
    }
    const msg = {
      _id: new Types.ObjectId(),
      author: true,
      message: input.message.trim(),
      assets: input.assets ?? [],
      createdAt: new Date(),
    };
    const u: { $push: { chats: typeof msg }; $set?: { status: TicketStatus } } = { $push: { chats: msg } };
    if (ticket.status === "pending") u.$set = { status: "en_cours" };
    const updated = await TicketModel.findByIdAndUpdate(ticket._id, u, { new: true, runValidators: true });
    if (!updated) return null;
    await notifyTicketOutbound({
      event: "message.added",
      reference: updated.reference,
      ticketId: String(updated._id),
      fromClient: true,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    });
    return updated;
  }

  async addMessageByAgent(
    ticketId: Id,
    input: { message: string; assets?: string[] }
  ): Promise<TicketDoc | null> {
    const ticket = await this.getById(ticketId);
    if (!ticket) return null;
    const msg = {
      _id: new Types.ObjectId(),
      author: false,
      message: input.message.trim(),
      assets: input.assets ?? [],
      createdAt: new Date(),
    };
    const u2: { $push: { chats: typeof msg }; $set?: { status: TicketStatus } } = { $push: { chats: msg } };
    if (ticket.status === "pending") u2.$set = { status: "en_cours" };
    const updated = await TicketModel.findByIdAndUpdate(ticket._id, u2, { new: true, runValidators: true });
    if (!updated) return null;
    await notifyTicketOutbound({
      event: "message.added",
      reference: updated.reference,
      ticketId: String(updated._id),
      fromClient: false,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    });
    void sendTicketClientNotifyNewReply({ to: updated.email, reference: updated.reference });
    return updated;
  }

  async listForAgents(params: {
    search?: string;
    status?: TicketStatus | "all";
    offset: number;
    limit: number;
  }): Promise<{
    items: {
      id: string;
      reference: string;
      objet: string;
      categorie: TicketCategorie;
      nomComplet: string;
      email: string;
      telephone: string;
      status: TicketStatus;
      messagePreview: string;
      chatCount: number;
      createdAt: string;
      updatedAt: string;
    }[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (params.status && params.status !== "all") {
      filter.status = params.status;
    }
    const search = (params.search ?? "").trim();
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(esc, "i");
      filter.$or = [
        { reference: rx },
        { email: rx },
        { nomComplet: rx },
        { objet: rx },
        { telephone: rx },
      ];
    }
    const [total, docs] = await Promise.all([
      TicketModel.countDocuments(filter),
      TicketModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(params.offset)
        .limit(params.limit)
        .lean()
        .exec(),
    ]);
    return {
      total,
      items: docs.map((d) => this.toAdminListItem(d as TicketDoc)),
    };
  }

  toAdminListItem(d: TicketDoc | (TicketDoc & Record<string, unknown>)) {
    const doc = d as TicketDoc;
    return {
      id: String(doc._id),
      reference: doc.reference,
      objet: doc.objet,
      categorie: doc.categorie,
      nomComplet: doc.nomComplet,
      email: doc.email,
      telephone: doc.telephone,
      status: doc.status,
      messagePreview: doc.message.slice(0, 120),
      chatCount: Array.isArray(doc.chats) ? doc.chats.length : 0,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
    };
  }

  toPublicJson(d: TicketDoc) {
    return {
      reference: d.reference,
      objet: d.objet,
      status: d.status,
      nomComplet: d.nomComplet,
      chats: (d.chats ?? []).map((c) => toMsg(c as never)),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : "",
    };
  }

  toAdminDetail(d: TicketDoc) {
    return {
      id: String(d._id),
      reference: d.reference,
      objet: d.objet,
      categorie: d.categorie,
      message: d.message,
      nomComplet: d.nomComplet,
      email: d.email,
      telephone: d.telephone,
      status: d.status,
      chats: (d.chats ?? []).map((c) => toMsg(c as never)),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : "",
    };
  }

  async updateStatus(id: Id, status: TicketStatus): Promise<TicketDoc | null> {
    return TicketModel.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true }).exec();
  }

  async delete(id: Id): Promise<boolean> {
    const r = await TicketModel.findByIdAndDelete(id).exec();
    return r != null;
  }
}

export default TicketService.getInstance();
