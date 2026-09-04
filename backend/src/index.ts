import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import mongoose from "mongoose";
import { authRoutes } from "./routes/auth";
import { documentRoutes } from "./routes/documents";
import { workspaceRoutes } from "./routes/workspaces";
import { credentialRoutes } from "./routes/credentials";

const app = Fastify({ logger: true });

async function start() {
  const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Range",
    ],
    exposedHeaders: [
      "Content-Length",
      "Content-Type",
      "Content-Range",
      "Accept-Ranges",
    ],
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev_secret_change_me",
  });
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(workspaceRoutes);
  await app.register(documentRoutes);
  await app.register(credentialRoutes);

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set. Add it to your .env file.");
  }
  if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" and add it to your .env",
    );
  }

  await mongoose.connect(mongoUri);
  app.log.info("Connected to MongoDB");

  const port = Number(process.env.PORT) || 5000;
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
