import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface IDocument extends MongooseDocument {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  workspace: Types.ObjectId;
  name: string;
  originalFileName: string;
  fileUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: { type: String, required: true },
    bytes: { type: Number, required: true },
  },
  { timestamps: true }
);

DocumentSchema.index({ user: 1, name: "text" });

export const DocumentModel = mongoose.model<IDocument>("Document", DocumentSchema);