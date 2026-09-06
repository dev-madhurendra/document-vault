import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { ShareLinkModel } from "../models/SharePermission";
import { DocumentModel } from "../models/Document";
import { authenticate } from "../middleware/auth";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

function serializeLink(link: any) {
  return {
    _id: link._id,
    url: `${process.env.CORS_ORIGIN}/share/${link.token}`,
    permission: link.permission,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    createdAt: link.createdAt,
  };
}

export async function shareLinkRoutes(app: FastifyInstance) {
  // Create a share link for a document
  app.post<{
    Params: { id: string };
    Body: { expiresIn?: number | null; permission?: "view" | "download" };
  }>(
    "/api/documents/:id/share-links",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { id } = request.params;
      const { expiresIn, permission } = request.body;

      const doc = await DocumentModel.findOne({ _id: id, user: user.id });
      if (!doc) {
        return reply.code(404).send({ error: "Document not found." });
      }

      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt =
        expiresIn && expiresIn > 0
          ? new Date(Date.now() + expiresIn * 1000)
          : null;

      const link = await ShareLinkModel.create({
        document: doc._id,
        user: user.id,
        token,
        permission: permission === "download" ? "download" : "view",
        expiresAt,
      });

      return reply.code(201).send({ link: serializeLink(link) });
    },
  );

  // List active share links for a document
  app.get<{ Params: { id: string } }>(
    "/api/documents/:id/share-links",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { id } = request.params;

      const doc = await DocumentModel.findOne({ _id: id, user: user.id });
      if (!doc) {
        return reply.code(404).send({ error: "Document not found." });
      }

      const links = await ShareLinkModel.find({
        document: doc._id,
        user: user.id,
        revokedAt: null,
      }).sort({ createdAt: -1 });

      return reply.send({ links: links.map(serializeLink) });
    },
  );

  // Revoke a share link
  app.delete<{ Params: { linkId: string } }>(
    "/api/share-links/:linkId",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const link = await ShareLinkModel.findOne({
        _id: request.params.linkId,
        user: user.id,
      });
      if (!link) {
        return reply.code(404).send({ error: "Share link not found." });
      }

      link.revokedAt = new Date();
      await link.save();

      return reply.send({ success: true });
    },
  );

  // Public, unauthenticated access via the share token
  app.get<{ Params: { token: string } }>(
    "/api/share/:token",
    async (request, reply) => {
      const link = await ShareLinkModel.findOne({ token: request.params.token });
      if (!link) {
        return reply.code(404).send({ error: "Link not found." });
      }
      if (link.revokedAt) {
        return reply.code(410).send({ error: "This link has been revoked." });
      }
      if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
        return reply.code(410).send({ error: "This link has expired." });
      }

      const doc = await DocumentModel.findById(link.document);
      if (!doc) {
        return reply.code(404).send({ error: "Document not found." });
      }

      if (link.permission === "download") {
        // Adjust to however you currently generate signed/download URLs
        // e.g. return reply.redirect(await getSignedDownloadUrl(doc));
        return reply.send({
          mode: "download",
          downloadUrl: doc.fileUrl, // replace with your Cloudinary signed URL logic
          name: doc.name,
        });
      }

      // View-only: point the frontend at something it can render inline
      // without exposing a directly downloadable URL
      return reply.send({
        mode: "view",
        viewUrl: doc.fileUrl, // ideally a proxied/inline URL, not the raw download link
        name: doc.name,
        format: doc.format,
      });
    },
  );
}