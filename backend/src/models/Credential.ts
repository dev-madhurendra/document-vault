import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

/**
 * A single dynamic field on a credential entry, e.g.:
 *   { label: "IBPS Roll No", value: <encrypted>, isSecret: false }
 *   { label: "Password",     value: <encrypted>, isSecret: true }
 *
 * `value` always stores the AES-GCM payload (see utils/crypto.ts), never
 * plain text, regardless of isSecret — isSecret only controls whether the
 * client masks it by default in the UI (roll numbers can still be shown
 * openly, passwords are masked until "reveal" is clicked).
 */
export interface ICredentialField {
  label: string;
  value: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  isSecret: boolean;
}

const CredentialFieldSchema = new Schema<ICredentialField>(
  {
    label: { type: String, required: true, trim: true },
    value: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },
    isSecret: { type: Boolean, default: true },
  },
  { _id: false }
);

export interface ICredential extends MongooseDocument {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  workspace: Types.ObjectId;
  title: string; // e.g. "IBPS SO IT 2026", "Netflix", "Home Wifi"
  fields: ICredentialField[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema = new Schema<ICredential>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    title: { type: String, required: true, trim: true },
    fields: { type: [CredentialFieldSchema], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CredentialSchema.index({ user: 1, title: "text" });

export const CredentialModel = mongoose.model<ICredential>("Credential", CredentialSchema);