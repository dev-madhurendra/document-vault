import { FastifyInstance } from "fastify";
import { WorkspaceModel, WorkspaceKind } from "../models/Workspace";
import { DocumentModel } from "../models/Document";
import { CredentialModel } from "../models/Credential";
import { User as UserModel } from "../models/User";
import { authenticate } from "../middleware/auth";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const DEFAULT_WORKSPACES: Array<{
  name: string;
  kind: WorkspaceKind;
  icon: string;
}> = [
  { name: "Documents", kind: "documents", icon: "📄" },
  { name: "Bills & Receipts", kind: "bills", icon: "🧾" },
  { name: "Certificates", kind: "certificates", icon: "🎓" },
  { name: "Credentials", kind: "credentials", icon: "🔐" },
];

/** Creates the four default workspaces for a user the first time they're needed. */
async function ensureDefaultWorkspaces(userId: string) {
  const existing = await WorkspaceModel.countDocuments({
    user: userId,
    isDefault: true,
  });
  if (existing > 0) return;

  await WorkspaceModel.insertMany(
    DEFAULT_WORKSPACES.map((ws) => ({ ...ws, user: userId, isDefault: true })),
    { ordered: false },
  ).catch(() => {
    // ignore duplicate-key races if this runs twice concurrently
  });
}

function serializeWorkspace(
  ws: any,
  counts: { documents: number; credentials: number },
) {
  return {
    _id: ws._id,
    name: ws.name,
    kind: ws.kind,
    icon: ws.icon,
    isDefault: ws.isDefault,
    itemCount: counts.documents + counts.credentials,
    documentCount: counts.documents,
    credentialCount: counts.credentials,
    createdAt: ws.createdAt,
  };
}

export async function workspaceRoutes(app: FastifyInstance) {
  // List all workspaces for the user, with item counts, seeding defaults on first call
  app.get(
    "/api/workspaces",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      await ensureDefaultWorkspaces(user.id);

      const workspaces = await WorkspaceModel.find({ user: user.id }).sort({
        isDefault: -1,
        createdAt: 1,
      });

      const withCounts = await Promise.all(
        workspaces.map(async (ws) => {
          const [documentCount, credentialCount] = await Promise.all([
            DocumentModel.countDocuments({ workspace: ws._id, user: user.id }),
            CredentialModel.countDocuments({
              workspace: ws._id,
              user: user.id,
            }),
          ]);
          return serializeWorkspace(ws, {
            documents: documentCount,
            credentials: credentialCount,
          });
        }),
      );

      return reply.send({ workspaces: withCounts });
    },
  );

  // Create a custom workspace (Requires Premium Plan)
  app.post<{ Body: { name: string; icon?: string } }>(
    "/api/workspaces",
    { preHandler: authenticate },
    async (request, reply) => {
      const authUser = request.user as AuthUser;

      // Fetch user from DB to verify subscription plan
      const userDoc = await UserModel.findById(authUser.id);
      if (!userDoc) {
        return reply.code(401).send({ error: "User not found." });
      }

      if (userDoc.plan !== "premium") {
        return reply.code(403).send({
          error:
            "Workspace creation is a Premium feature. Upgrade your subscription to create custom workspaces.",
        });
      }

      const name = (request.body?.name || "").trim();
      const icon = (request.body?.icon || "📁").trim();

      if (!name) {
        return reply.code(400).send({ error: "Workspace name is required." });
      }

      const already = await WorkspaceModel.findOne({ user: authUser.id, name });
      if (already) {
        return reply
          .code(409)
          .send({ error: "You already have a workspace with that name." });
      }

      const workspace = await WorkspaceModel.create({
        user: authUser.id,
        name,
        icon,
        kind: "custom",
        isDefault: false,
      });

      return reply.code(201).send({
        workspace: serializeWorkspace(workspace, {
          documents: 0,
          credentials: 0,
        }),
      });
    },
  );

  // Rename a workspace
  app.patch<{ Params: { id: string }; Body: { name?: string; icon?: string } }>(
    "/api/workspaces/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const workspace = await WorkspaceModel.findOne({
        _id: request.params.id,
        user: user.id,
      });
      if (!workspace) {
        return reply.code(404).send({ error: "Workspace not found." });
      }

      if (request.body?.name) workspace.name = request.body.name.trim();
      if (request.body?.icon) workspace.icon = request.body.icon.trim();
      await workspace.save();

      const [documentCount, credentialCount] = await Promise.all([
        DocumentModel.countDocuments({
          workspace: workspace._id,
          user: user.id,
        }),
        CredentialModel.countDocuments({
          workspace: workspace._id,
          user: user.id,
        }),
      ]);

      return reply.send({
        workspace: serializeWorkspace(workspace, {
          documents: documentCount,
          credentials: credentialCount,
        }),
      });
    },
  );

  // Delete a custom workspace
  app.delete<{ Params: { id: string } }>(
    "/api/workspaces/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const workspace = await WorkspaceModel.findOne({
        _id: request.params.id,
        user: user.id,
      });
      if (!workspace) {
        return reply.code(404).send({ error: "Workspace not found." });
      }
      if (workspace.isDefault) {
        return reply
          .code(400)
          .send({ error: "Default workspaces can't be deleted." });
      }

      const fallback = await WorkspaceModel.findOne({
        user: user.id,
        kind: "documents",
        isDefault: true,
      });
      if (fallback) {
        await DocumentModel.updateMany(
          { workspace: workspace._id, user: user.id },
          { workspace: fallback._id },
        );
        await CredentialModel.updateMany(
          { workspace: workspace._id, user: user.id },
          { workspace: fallback._id },
        );
      }

      await workspace.deleteOne();
      return reply.send({
        success: true,
        movedItemsTo: fallback ? fallback._id : null,
      });
    },
  );
}