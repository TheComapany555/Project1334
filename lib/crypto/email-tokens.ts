/**
 * Symmetric encryption for OAuth tokens stored on broker_email_accounts.
 *
 * AES-256-GCM via Node's built-in `crypto` — no extra dependency, no key
 * material ever lands in the database. The encryption key is loaded from
 * `EMAIL_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 bytes; generate with
 * `openssl rand -base64 32`).
 *
 * Output format (base64-url, dot-joined):
 *   <iv>.<authTag>.<ciphertext>
 *
 * This way one column on `broker_email_accounts` holds everything needed to
 * decrypt — no separate IV column, no key versioning needed for v1.
 *
 * Rotating the key later: re-encrypt every row using the new key and overwrite.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm" as const;
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "EMAIL_TOKEN_ENCRYPTION_KEY env var is not set — required to store OAuth tokens.",
    );
  }
  // Accept either base64 (recommended) or hex.
  const buf =
    raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `EMAIL_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`,
    );
  }
  cachedKey = buf;
  return buf;
}

function toUrlSafe(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromUrlSafe(s: string): Buffer {
  // Pad to 4-byte boundary and reverse url-safe substitutions.
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  return Buffer.from(b64 + "=".repeat(pad), "base64");
}

export function encryptToken(plain: string): string {
  if (!plain) return "";
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${toUrlSafe(iv)}.${toUrlSafe(tag)}.${toUrlSafe(ciphertext)}`;
}

export function decryptToken(payload: string): string {
  if (!payload) return "";
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload");
  }
  const key = loadKey();
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(ALGO, key, fromUrlSafe(ivB64));
  decipher.setAuthTag(fromUrlSafe(tagB64));
  const plain = Buffer.concat([
    decipher.update(fromUrlSafe(ctB64)),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

/** True when the encryption key env var is set. UI uses this to hide the
 *  "Connect inbox" feature when the platform isn't configured. */
export function isEmailTokenCryptoConfigured(): boolean {
  return !!process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
}
