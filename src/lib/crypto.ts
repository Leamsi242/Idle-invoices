import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Field-level encryption at rest (AES-256-GCM) for labels, merchants and plans.
 * SQLite files are not encrypted by themselves, so sensitive text is encrypted before
 * it reaches the database. The key comes from DATA_ENCRYPTION_KEY (32 bytes, base64).
 */
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32).");
    cachedKey = k;
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is required in production.");
  } else {
    console.warn("DATA_ENCRYPTION_KEY is not set: using a development-only key.");
    cachedKey = createHash("sha256").update("subscription-detective-dev-key").digest();
  }
  return cachedKey;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}

export function decrypt(stored: string): string {
  if (!stored.startsWith("v1:")) throw new Error("Unknown encryption format");
  const buf = Buffer.from(stored.slice(3), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export const encryptOptional = (s?: string | null) => (s ? encrypt(s) : null);
export const decryptOptional = (s?: string | null) => (s ? decrypt(s) : undefined);
