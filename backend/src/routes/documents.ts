import { FastifyInstance } from "fastify";
import { DocumentModel, IDocument } from "../models/Document";
import { WorkspaceModel } from "../models/Workspace";
import { User as UserModel } from "../models/User";
import { authenticate } from "../middleware/auth";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  buildDownloadUrl,
  buildThumbnailUrl,
} from "../utils/cloudinary";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const INLINE_VIEWABLE_FORMATS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "pdf", "bmp", "tiff",
]);

function serializeDocument(doc: IDocument) {
  const format = (doc.format || "").toLowerCase();
  const viewable = doc.resourceType === "image" && INLINE_VIEWABLE_FORMATS.has(format);
  return {
    _id: doc._id,
    workspaceId: doc.workspace,
    name: doc.name,
    originalFileName: doc.originalFileName,
    format: doc.format,
    bytes: doc.bytes,
    createdAt: doc.createdAt,
    thumbnailUrl: buildThumbnailUrl(doc.publicId, doc.resourceType, doc.format),
    viewable,
    viewUrl: viewable ? doc.fileUrl : null,
  };
}

export async function documentRoutes(app: FastifyInstance) {
  // 1. Upload Document with Plan Verification
  app.post("/api/documents/upload", { preHandler: authenticate }, async (request, reply) => {
    const authUser = request.user as AuthUser;
    const parts = request.parts();

    let fileBuffer: Buffer | null = null;
    let originalFileName = "";
    let documentName = "";
    let workspaceId = "";

    for await (const part of parts) {
      if (part.type === "file") {
        fileBuffer = await part.toBuffer();
        originalFileName = part.filename;
      } else if (part.fieldname === "name") {
        documentName = String(part.value || "").trim();
      } else if (part.fieldname === "workspaceId") {
        workspaceId = String(part.value || "").trim();
      }
    }

    if (!fileBuffer) {
      return reply.code(400).send({ error: "No file was uploaded." });
    }
    if (!workspaceId) {
      return reply.code(400).send({ error: "workspaceId is required." });
    }

    const workspace = await WorkspaceModel.findOne({ _id: workspaceId, user: authUser.id });
    if (!workspace) {
      return reply.code(404).send({ error: "Workspace not found." });
    }

    // Check user plan limits
    const userDoc = await UserModel.findById(authUser.id);
    if (!userDoc) {
      return reply.code(401).send({ error: "User not found." });
    }

    if (userDoc.plan === "basic") {
      const existingDocCount = await DocumentModel.countDocuments({
        user: authUser.id,
        workspace: workspaceId,
      });

      if (existingDocCount >= 1) {
        return reply.code(403).send({
          error:
            "You are currently on the Basic plan (limit: 1 document per workspace). Upgrade to Premium to unlock unlimited uploads and full vault feature access.",
        });
      }
    }

    if (!documentName) {
      documentName = originalFileName;
    }

    const result = await uploadBufferToCloudinary(fileBuffer, `docvault/${authUser.id}`);

    const doc = await DocumentModel.create({
      user: authUser.id,
      workspace: workspaceId,
      name: documentName,
      originalFileName,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    });

    return reply.code(201).send({ document: serializeDocument(doc) });
  });

  // 2. Fetch Documents (Paginated)
  app.get<{ Querystring: { search?: string; workspaceId?: string; page?: string; limit?: string } }>(
    "/api/documents",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { search, workspaceId } = request.query;
      const page = Math.max(1, parseInt(request.query.page || "1", 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(request.query.limit || "8", 10) || 8));

      const query: Record<string, unknown> = { user: user.id };
      if (workspaceId && workspaceId !== "all") query.workspace = workspaceId;
      if (search && search.trim()) {
        query.name = { $regex: search.trim(), $options: "i" };
      }

      const [total, documents] = await Promise.all([
        DocumentModel.countDocuments(query),
        DocumentModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
      ]);

      return reply.send({
        documents: documents.map(serializeDocument),
        total,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }
  );

  // 3. Move Multiple Documents (Bulk or Single Move Endpoint)
  app.patch<{ Body: { documentIds?: string[]; targetWorkspaceId?: string } }>(
    "/api/documents/move",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { documentIds, targetWorkspaceId } = request.body || {};

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return reply.code(400).send({ error: "No document IDs provided." });
      }

      if (!targetWorkspaceId) {
        return reply.code(400).send({ error: "Target workspace ID is required." });
      }

      const workspace = await WorkspaceModel.findOne({ _id: targetWorkspaceId, user: user.id });
      if (!workspace) {
        return reply.code(404).send({ error: "Target workspace not found." });
      }

      await DocumentModel.updateMany(
        { _id: { $in: documentIds }, user: user.id },
        { $set: { workspace: targetWorkspaceId } }
      );

      return reply.send({ message: "Documents moved successfully." });
    }
  );

  // 4. Rename Document
  app.patch<{ Params: { id: string }; Body: { name?: string } }>(
    "/api/documents/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const name = (request.body?.name || "").trim();
      if (!name) {
        return reply.code(400).send({ error: "Name can't be empty." });
      }

      const doc = await DocumentModel.findOne({ _id: request.params.id, user: user.id });
      if (!doc) {
        return reply.code(404).send({ error: "Document not found." });
      }

      doc.name = name;
      await doc.save();
      return reply.send({ document: serializeDocument(doc) });
    }
  );

  // 5. Move Single Document by URL ID
  app.patch<{ Params: { id: string }; Body: { workspaceId?: string } }>(
    "/api/documents/:id/move",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { workspaceId } = request.body || {};
      if (!workspaceId) {
        return reply.code(400).send({ error: "workspaceId is required." });
      }

      const [doc, workspace] = await Promise.all([
        DocumentModel.findOne({ _id: request.params.id, user: user.id }),
        WorkspaceModel.findOne({ _id: workspaceId, user: user.id }),
      ]);
      if (!doc) return reply.code(404).send({ error: "Document not found." });
      if (!workspace) return reply.code(404).send({ error: "Target workspace not found." });

      doc.workspace = workspace._id;
      await doc.save();
      return reply.send({ document: serializeDocument(doc) });
    }
  );

  // 6. Replace File
  app.put("/api/documents/:id/file", { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const doc = await DocumentModel.findOne({ _id: id, user: user.id });
    if (!doc) {
      return reply.code(404).send({ error: "Document not found." });
    }

    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let originalFileName = "";
    let newName = "";

    for await (const part of parts) {
      if (part.type === "file") {
        fileBuffer = await part.toBuffer();
        originalFileName = part.filename;
      } else if (part.fieldname === "name") {
        newName = String(part.value || "").trim();
      }
    }

    if (!fileBuffer) {
      return reply.code(400).send({ error: "No replacement file was uploaded." });
    }

    const result = await uploadBufferToCloudinary(fileBuffer, `docvault/${user.id}`);
    const oldPublicId = doc.publicId;
    const oldResourceType = doc.resourceType;

    doc.originalFileName = originalFileName;
    doc.fileUrl = result.secure_url;
    doc.publicId = result.public_id;
    doc.resourceType = result.resource_type;
    doc.format = result.format;
    doc.bytes = result.bytes;
    if (newName) doc.name = newName;
    await doc.save();

    await deleteFromCloudinary(oldPublicId, oldResourceType).catch(() => {});

    return reply.send({ document: serializeDocument(doc) });
  });

  // 7. Get Download URL
  app.get<{ Params: { id: string } }>(
    "/api/documents/:id/download",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const doc = await DocumentModel.findOne({ _id: request.params.id, user: user.id });
      if (!doc) {
        return reply.code(404).send({ error: "Document not found." });
      }
      const downloadUrl = buildDownloadUrl(doc.publicId, doc.resourceType, doc.originalFileName);
      return reply.send({ downloadUrl });
    }
  );

  // 8. Delete Document
  app.delete<{ Params: { id: string } }>(
    "/api/documents/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const doc = await DocumentModel.findOne({ _id: request.params.id, user: user.id });
      if (!doc) {
        return reply.code(404).send({ error: "Document not found." });
      }
      await deleteFromCloudinary(doc.publicId, doc.resourceType);
      await doc.deleteOne();
      return reply.send({ success: true });
    }
  );
}