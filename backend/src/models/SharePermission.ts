import { Schema, model, Document as MongooseDocument, Types } from "mongoose";

export type SharePermission = "view" | "download";

export interface IShareLink extends MongooseDocument {
  _id: Types.ObjectId;
  document: Types.ObjectId;
  user: Types.ObjectId;
  token: string;
  permission: SharePermission;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
}

const shareLinkSchema = new Schema<IShareLink>({
  document: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, unique: true, index: true },
  permission: { type: String, enum: ["view", "download"], default: "view" },
  expiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// A link is usable only if it hasn't been revoked and hasn't passed its expiry
shareLinkSchema.methods.isActive = function (this: IShareLink) {
  if (this.revokedAt) return false;
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return false;
  return true;
};

export const ShareLinkModel = model<IShareLink>("ShareLink", shareLinkSchema);