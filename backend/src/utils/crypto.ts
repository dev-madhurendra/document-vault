import crypto from "crypto";

/**
 * IMPORTANT: This is REVERSIBLE ENCRYPTION, not hashing.
 *
 * Login passwords (bcrypt, in auth.ts) are hashed one-way because we only
 * ever need to *check* them, never see them again.
 *
 * Vault credential values (IBPS roll no, exam password, wifi password, etc.)
 * are different: the whole point is that the user comes back later and asks
 * "show me that password". A one-way hash can never be turned back into the
 * original value, so bcrypt/argon2 is the wrong tool here. We need something
 * we can decrypt on demand -> AES-256-GCM with a server-side master key.
 *
 * GCM also gives us an auth tag, so tampering with ciphertext in the DB is
 * detected on decrypt instead of silently returning garbage.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

function getKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" and put it in your .env"
    );
  }
  const key = Buffer.from(secret, "hex");
  if (key.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be a 32-byte value hex-encoded (64 hex chars).");
  }
  return key;
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

export function encryptValue(plainText: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptValue(payload: EncryptedPayload): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/** Returns a short masked preview like "••••••7890" for list views, without decrypting. */
export function maskHint(plainTextLength: number): string {
  const dots = "•".repeat(Math.min(8, Math.max(4, plainTextLength - 2)));
  return dots;
}