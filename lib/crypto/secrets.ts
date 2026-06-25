/**
 * Symmetric encryption for third-party integration secrets stored at rest
 * (e.g. Agentbox API keys on `agency_integrations.api_key_encrypted`).
 *
 * AES-256-GCM via Node's built-in `crypto` — no extra dependency, no key
 * material ever lands in the database. The key is loaded from
 * `INTEGRATION_ENCRYPTION_KEY` (base64-encoded 32 bytes; generate with
 * `openssl rand -base64 32`). Kept separate from EMAIL_TOKEN_ENCRYPTION_KEY so
 * the two feature areas have independent blast radii.
 *
 * Output format (base64-url, dot-joined): <iv>.<authTag>.<ciphertext>
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm" as const;
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY env var is not set — required to store integration credentials.",
    );
  }
  // Accept either hex (64 chars) or base64 (recommended).
  const buf = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `INTEGRATION_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`,
    );
  }
  cachedKey = buf;
  return buf;
}

function toUrlSafe(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(s: string): Buffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  return Buffer.from(b64 + "=".repeat(pad), "base64");
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${toUrlSafe(iv)}.${toUrlSafe(tag)}.${toUrlSafe(ciphertext)}`;
}

export function decryptSecret(payload: string): string {
  if (!payload) return "";
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Malformed encrypted secret payload");
  const key = loadKey();
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(ALGO, key, fromUrlSafe(ivB64));
  decipher.setAuthTag(fromUrlSafe(tagB64));
  const plain = Buffer.concat([decipher.update(fromUrlSafe(ctB64)), decipher.final()]);
  return plain.toString("utf8");
}

/** True when the integration encryption key is configured. UI/actions gate on this. */
export function isIntegrationCryptoConfigured(): boolean {
  return !!process.env.INTEGRATION_ENCRYPTION_KEY;
}

/** Mask a credential for display, e.g. "efb7…cc4a". Never returns the middle. */
export function maskCredential(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}
