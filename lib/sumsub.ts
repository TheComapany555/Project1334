/**
 * Sumsub REST client — server-only.
 *
 * Sumsub has no maintained Node server SDK, so we sign requests by hand with
 * Node's built-in `crypto` (no extra dependency). Every request carries:
 *   X-App-Token       — the app token (env)
 *   X-App-Access-Ts   — unix seconds
 *   X-App-Access-Sig  — HMAC-SHA256(secretKey, ts + METHOD + path+query + body)
 *
 * Sandbox vs production is selected by which app token you generate in the
 * Sumsub dashboard; the base URL is the same (override with SUMSUB_BASE_URL).
 *
 * Phase 1 uses the "WebSDK link" flow: we generate a hosted verification link
 * tied to an externalUserId (= our contact id) and email it to the buyer.
 * Sumsub creates/reuses one applicant per externalUserId, so the same buyer
 * isn't re-verified per listing. Results arrive via /api/sumsub/webhook.
 */

import { createHmac } from "node:crypto";
import type { KybVerificationStatus } from "@/lib/types/kyb";

const DEFAULT_BASE_URL = "https://api.sumsub.com";
const DEFAULT_TTL_SECS = 60 * 60 * 24 * 7; // 7 days

type SumsubConfig = {
  appToken: string;
  secretKey: string;
  baseUrl: string;
  levelName: string;
};

/** True when the minimum env to call Sumsub is present. UI uses this to gate the trigger button. */
export function isSumsubConfigured(): boolean {
  return Boolean(
    process.env.SUMSUB_APP_TOKEN &&
      process.env.SUMSUB_SECRET_KEY &&
      process.env.SUMSUB_LEVEL_NAME,
  );
}

/** True when a company/KYB verification level is configured (Phase 2). */
export function isSumsubCompanyConfigured(): boolean {
  return isSumsubConfigured() && Boolean(process.env.SUMSUB_COMPANY_LEVEL_NAME);
}

function loadConfig(): SumsubConfig {
  const appToken = process.env.SUMSUB_APP_TOKEN;
  const secretKey = process.env.SUMSUB_SECRET_KEY;
  const levelName = process.env.SUMSUB_LEVEL_NAME;
  if (!appToken || !secretKey || !levelName) {
    throw new Error(
      "Sumsub is not configured — set SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY and SUMSUB_LEVEL_NAME.",
    );
  }
  return {
    appToken,
    secretKey,
    levelName,
    baseUrl: process.env.SUMSUB_BASE_URL || DEFAULT_BASE_URL,
  };
}

/**
 * Signed fetch against the Sumsub API. `path` must include the leading slash
 * and any query string (both are part of the signed payload).
 */
async function signedFetch<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const cfg = loadConfig();
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body === undefined ? "" : JSON.stringify(body);

  const signature = createHmac("sha256", cfg.secretKey)
    .update(ts + method + path + bodyStr)
    .digest("hex");

  const res = await fetch(cfg.baseUrl + path, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-App-Token": cfg.appToken,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": signature,
    },
    body: body === undefined ? undefined : bodyStr,
    // Sumsub is an external service — never let a hung request wedge a server action.
    signal: AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Sumsub ${method} ${path} failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// ── Verification link (the thing we email the buyer) ───────────────────────

/**
 * Generate a hosted verification link for a buyer. Sumsub creates or reuses the
 * applicant keyed by `externalUserId`, so re-sending a link to the same buyer
 * resumes the same applicant rather than starting over.
 */
export async function generateVerificationLink(args: {
  externalUserId: string;
  /** Verification level. Defaults to the individual KYC level (SUMSUB_LEVEL_NAME). */
  levelName?: string;
  ttlSecs?: number;
  lang?: string;
}): Promise<{ url: string }> {
  const cfg = loadConfig();
  const params = new URLSearchParams({
    ttlInSecs: String(args.ttlSecs ?? DEFAULT_TTL_SECS),
    externalUserId: args.externalUserId,
    lang: args.lang ?? "en",
  });
  const path = `/resources/sdkIntegrations/levels/${encodeURIComponent(
    args.levelName ?? cfg.levelName,
  )}/websdkLink?${params.toString()}`;
  const data = await signedFetch<{ url: string }>("POST", path);
  return { url: data.url };
}

/** The configured company/KYB level name, or throws if unset. */
export function companyLevelName(): string {
  const lvl = process.env.SUMSUB_COMPANY_LEVEL_NAME;
  if (!lvl) {
    throw new Error(
      "Company verification isn't configured — set SUMSUB_COMPANY_LEVEL_NAME.",
    );
  }
  return lvl;
}

/**
 * Create a company (KYB) applicant pre-filled with the company's details, or
 * return the existing one if it was already created for this externalUserId.
 * `registrationNumber` is the ACN/ABN.
 */
export async function createOrGetCompanyApplicant(args: {
  externalUserId: string;
  companyName: string;
  registrationNumber: string;
  country?: string;
}): Promise<{ id: string }> {
  const levelName = companyLevelName();
  const body = {
    externalUserId: args.externalUserId,
    type: "company",
    companyInfo: {
      companyName: args.companyName,
      registrationNumber: args.registrationNumber || undefined,
      country: args.country ?? "AUS",
    },
  };
  try {
    const created = await signedFetch<{ id: string }>(
      "POST",
      `/resources/applicants?levelName=${encodeURIComponent(levelName)}`,
      body,
    );
    return { id: created.id };
  } catch (err) {
    // Most likely the applicant already exists (409) — reuse it.
    const existing = await getApplicantByExternalUserId(args.externalUserId);
    if (existing?.id) return { id: existing.id };
    throw err;
  }
}

// ── Applicant lookups (used by the webhook to pull verified data) ──────────

export type SumsubApplicant = {
  id: string;
  externalUserId?: string;
  info?: {
    firstName?: string;
    lastName?: string;
    dob?: string; // YYYY-MM-DD
    addresses?: {
      formattedAddress?: string;
      street?: string;
      town?: string;
      state?: string;
      postCode?: string;
      country?: string;
    }[];
  };
  review?: {
    reviewStatus?: string;
    reviewResult?: {
      reviewAnswer?: "GREEN" | "RED";
      reviewRejectType?: "RETRY" | "FINAL";
      rejectLabels?: string[];
    };
  };
  type?: string; // "individual" | "company"
  companyInfo?: {
    companyName?: string;
    registrationNumber?: string;
    country?: string;
    beneficiaries?: unknown[];
  };
};

/** Fetch the full applicant by Sumsub applicant id. */
export async function getApplicant(applicantId: string): Promise<SumsubApplicant> {
  return signedFetch<SumsubApplicant>(
    "GET",
    `/resources/applicants/${encodeURIComponent(applicantId)}/one`,
  );
}

/** Fetch the applicant by our externalUserId (= contact id). Null if none yet. */
export async function getApplicantByExternalUserId(
  externalUserId: string,
): Promise<SumsubApplicant | null> {
  try {
    return await signedFetch<SumsubApplicant>(
      "GET",
      `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`,
    );
  } catch {
    return null; // 404 when the buyer hasn't opened the link yet
  }
}

// ── Result mapping ─────────────────────────────────────────────────────────

/** Map a Sumsub review answer to our internal status. */
export function mapReviewToStatus(
  reviewAnswer: "GREEN" | "RED" | undefined,
  reviewRejectType: "RETRY" | "FINAL" | undefined,
): KybVerificationStatus {
  if (reviewAnswer === "GREEN") return "approved";
  if (reviewAnswer === "RED") {
    return reviewRejectType === "RETRY" ? "resubmission_requested" : "rejected";
  }
  return "pending";
}

/** Pull the first formatted address + dob from an applicant's verified info. */
export function extractVerifiedIdentity(applicant: SumsubApplicant): {
  dob: string | null;
  address: string | null;
} {
  const info = applicant.info;
  const addr = info?.addresses?.[0];
  const formatted =
    addr?.formattedAddress ||
    [addr?.street, addr?.town, addr?.state, addr?.postCode, addr?.country]
      .filter(Boolean)
      .join(", ") ||
    null;
  return { dob: info?.dob ?? null, address: formatted };
}

/** Pull company info + beneficial owners from a verified company applicant. */
export function extractCompanyData(applicant: SumsubApplicant): {
  company: Record<string, unknown> | null;
  beneficialOwners: unknown[] | null;
} {
  const ci = applicant.companyInfo;
  if (!ci) return { company: null, beneficialOwners: null };
  const { beneficiaries, ...rest } = ci;
  return {
    company: rest as Record<string, unknown>,
    beneficialOwners: Array.isArray(beneficiaries) ? beneficiaries : null,
  };
}
