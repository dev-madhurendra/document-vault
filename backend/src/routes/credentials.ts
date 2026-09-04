import { FastifyInstance } from "fastify";
import { CredentialModel, ICredentialField } from "../models/Credential";
import { WorkspaceModel } from "../models/Workspace";
import { authenticate } from "../middleware/auth";
import { encryptValue, decryptValue } from "../utils/crypto";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface IncomingField {
  label: string;
  value: string;
  isSecret?: boolean;
}

const MAX_FIELDS_PER_CREDENTIAL = 20;

function validateFields(fields: IncomingField[] | undefined): { error?: string; clean?: IncomingField[] } {
  if (!Array.isArray(fields) || fields.length === 0) {
    return { error: "At least one field (e.g. 'Roll No', 'Password') is required." };
  }
  if (fields.length > MAX_FIELDS_PER_CREDENTIAL) {
    return { error: `A credential can have at most ${MAX_FIELDS_PER_CREDENTIAL} fields.` };
  }
  for (const f of fields) {
    if (!f.label || !f.label.trim()) {
      return { error: "Every field needs a label (e.g. 'IBPS Roll No')." };
    }
    if (f.value === undefined || f.value === null || f.value === "") {
      return { error: `Field "${f.label}" needs a value.` };
    }
  }
  return { clean: fields.map((f) => ({ label: f.label.trim(), value: String(f.value), isSecret: f.isSecret !== false })) };
}

/** List/summary view: fields come back masked, never decrypted. */
function serializeCredentialSummary(cred: any) {
  return {
    _id: cred._id,
    title: cred.title,
    workspaceId: cred.workspace,
    notes: cred.notes || "",
    fieldLabels: cred.fields.map((f: ICredentialField) => ({ label: f.label, isSecret: f.isSecret })),
    fieldCount: cred.fields.length,
    createdAt: cred.createdAt,
    updatedAt: cred.updatedAt,
  };
}

export async function credentialRoutes(app: FastifyInstance) {
  // List credentials (masked) for a workspace, paginated
  app.get<{ Querystring: { workspaceId?: string; search?: string; page?: string; limit?: string } }>(
    "/api/credentials",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { workspaceId, search } = request.query;
      const page = Math.max(1, parseInt(request.query.page || "1", 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(request.query.limit || "8", 10) || 8));

      const query: Record<string, unknown> = { user: user.id };
      if (workspaceId) query.workspace = workspaceId;
      if (search && search.trim()) query.title = { $regex: search.trim(), $options: "i" };

      const [total, items] = await Promise.all([
        CredentialModel.countDocuments(query),
        CredentialModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
      ]);

      return reply.send({
        credentials: items.map(serializeCredentialSummary),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    }
  );

  // Create a new credential entry with dynamic fields
  app.post<{ Body: { workspaceId: string; title: string; notes?: string; fields: IncomingField[] } }>(
    "/api/credentials",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { workspaceId, title, notes } = request.body || ({} as any);

      if (!workspaceId || !title || !title.trim()) {
        return reply.code(400).send({ error: "Workspace and title are required." });
      }

      const workspace = await WorkspaceModel.findOne({ _id: workspaceId, user: user.id });
      if (!workspace) {
        return reply.code(404).send({ error: "Workspace not found." });
      }

      const { error, clean } = validateFields(request.body?.fields);
      if (error || !clean) {
        return reply.code(400).send({ error });
      }

      const encryptedFields = clean.map((f) => ({
        label: f.label,
        value: encryptValue(f.value),
        isSecret: f.isSecret ?? true,
      }));

      const credential = await CredentialModel.create({
        user: user.id,
        workspace: workspaceId,
        title: title.trim(),
        notes: notes?.trim(),
        fields: encryptedFields,
      });

      return reply.code(201).send({ credential: serializeCredentialSummary(credential) });
    }
  );

  // Update title/notes/fields (fields are replaced wholesale, then re-encrypted)
  app.put<{ Params: { id: string }; Body: { title?: string; notes?: string; fields?: IncomingField[] } }>(
    "/api/credentials/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const credential = await CredentialModel.findOne({ _id: request.params.id, user: user.id });
      if (!credential) {
        return reply.code(404).send({ error: "Credential not found." });
      }

      if (request.body?.title) credential.title = request.body.title.trim();
      if (request.body?.notes !== undefined) credential.notes = request.body.notes.trim();

      if (request.body?.fields) {
        const { error, clean } = validateFields(request.body.fields);
        if (error || !clean) {
          return reply.code(400).send({ error });
        }
        credential.fields = clean.map((f) => ({
          label: f.label,
          value: encryptValue(f.value),
          isSecret: f.isSecret ?? true,
        })) as any;
      }

      await credential.save();
      return reply.send({ credential: serializeCredentialSummary(credential) });
    }
  );

  // Explicit reveal: decrypts and returns actual field values.
  // Kept as a separate call (not part of the list endpoint) so plaintext
  // secrets only ever leave the server when the user deliberately asks.
  app.post<{ Params: { id: string } }>(
    "/api/credentials/:id/reveal",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const credential = await CredentialModel.findOne({ _id: request.params.id, user: user.id });
      if (!credential) {
        return reply.code(404).send({ error: "Credential not found." });
      }

      try {
        const fields = credential.fields.map((f) => ({
          label: f.label,
          value: decryptValue(f.value),
          isSecret: f.isSecret,
        }));
        return reply.send({ _id: credential._id, title: credential.title, fields });
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "Could not decrypt this credential. It may be corrupted." });
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/credentials/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const credential = await CredentialModel.findOne({ _id: request.params.id, user: user.id });
      if (!credential) {
        return reply.code(404).send({ error: "Credential not found." });
      }
      await credential.deleteOne();
      return reply.send({ success: true });
    }
  );
}