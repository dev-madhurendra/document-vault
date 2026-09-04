import { Schema, model, Document as MongooseDocument, Types } from "mongoose";

export interface IDocument extends MongooseDocument {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  originalFileName: string;
  fileUrl: string;
  publicId: string;
  resourceType: string;
  format?: string;
  bytes?: number;
  createdAt: Date;
}

const documentSchema = new Schema<IDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  originalFileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
  format: { type: String },
  bytes: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export const DocumentModel = model<IDocument>("Document", documentSchema);