import { Schema, model, Document as MongooseDocument, Types } from "mongoose";

export interface IUser extends MongooseDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  plan: "basic" | "premium"
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  plan: { type: String, enum: ["basic", "premium"], default: "basic" },
  otp: { type: String, default: undefined },
  otpExpiresAt: { type: Date, default: undefined },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);