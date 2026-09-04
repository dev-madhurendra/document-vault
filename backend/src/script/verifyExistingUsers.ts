import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User";

async function verifyAllUsers() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is missing.");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB...");

    // Update all users where isVerified is false or field is missing
    const result = await User.updateMany(
      { $or: [{ isVerified: false }, { isVerified: { $exists: false } }] },
      {
        $set: { isVerified: true },
        $unset: { otp: "", otpExpiresAt: "" },
      }
    );

    console.log(`Successfully verified ${result.modifiedCount} existing user(s).`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

verifyAllUsers();