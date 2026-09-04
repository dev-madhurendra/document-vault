import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export type WorkspaceKind = "documents" | "bills" | "certificates" | "credentials" | "custom";

export interface IWorkspace extends MongooseDocument {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  kind: WorkspaceKind;
  icon?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["documents", "bills", "certificates", "credentials", "custom"],
      default: "custom",
    },
    icon: { type: String, default: "📁" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A user can't have two workspaces with the exact same name
WorkspaceSchema.index({ user: 1, name: 1 }, { unique: true });

export const WorkspaceModel = mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);