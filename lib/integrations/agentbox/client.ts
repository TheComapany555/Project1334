/**
 * Agentbox (Reapit Sales) HTTP client. Server-only.
 *
 * Auth: the legacy Agentbox-native API authenticates with two static headers —
 * `X-Client-ID` and `X-API-Key` (NOT Reapit Foundations OAuth). Base URL is
 * `https://api.agentboxcrm.com.au` (override with AGENTBOX_API_BASE_URL for the
 * sandbox if its host differs).
 *
 * Rate limit (documented): 20 requests / 5 seconds (240/min); a 429 means retry.
 * We throttle to ~4 req/s and back off + honour Retry-After on 429.
 *
 * IP allowlist: the API + docs are restricted to whitelisted IPs. Until our IP
 * is whitelisted, requests fail (typically 403 / network error) — surfaced as
 * `ipBlocked: true` so the UI can say "pending IP whitelisting" rather than
 * "bad credentials".
 *
 * ⚠️ Endpoint paths / response envelope / pagination params are modelled on the
 * documented API and MUST be verified against the live sandbox once whitelisted
 * (see the plan). They are isolated here for a cheap one-file adjustment.
 */

import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { AgentboxRawListing } from "./map";
import type { IntegrationCredentials, VerifyResult } from "../types";
import { validateAgentboxClientId } from "@/lib/agentbox-sync-shared";

const DEFAULT_BASE_URL = "https://api.agentboxcrm.com.au";
/** Agentbox requires a `version` query param on every request (else HTTP 300). */
const DEFAULT_API_VERSION = (process.env.AGENTBOX_API_VERSION || "1").trim() || "1";
const PAGE_SIZE = 50;
/** Safety cap on pages fetched per sync (manual sync; shared sandbox is small). */
const MAX_PAGES = 10;
const MIN_REQUEST_GAP_MS = 260; // ~3.8 req/s, comfortably under 20/5s
const MAX_429_RETRIES = 4;
const REQUEST_TIMEOUT_MS = 20_000;

function baseUrl(): string {
  return (process.env.AGENTBOX_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/**
 * Optional static-IP egress proxy. Serverless hosts (e.g. Vercel) rotate their
 * outbound IP, which Reapit can't whitelist. Routing Agentbox calls through a
 * fixed-IP proxy (QuotaGuard Static / Fixie / …) gives Reapit ONE stable IP to
 * allowlist. Set AGENTBOX_PROXY_URL, or the provider's own var is picked up too.
 */
function getProxyUrl(): string | null {
  return (
    process.env.AGENTBOX_PROXY_URL?.trim() ||
    process.env.QUOTAGUARDSTATIC_URL?.trim() ||
    process.env.FIXIE_URL?.trim() ||
    null
  );
}

let cachedDispatcher: ProxyAgent | null = null;
let cachedProxyUrl: string | null = null;
function getProxyDispatcher(): ProxyAgent | undefined {
  const url = getProxyUrl();
  if (!url) return undefined;
  if (!cachedDispatcher || cachedProxyUrl !== url) {
    cachedDispatcher = new ProxyAgent(url);
    cachedProxyUrl = url;
  }
  return cachedDispatcher;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Remember a version that worked for this process (sandbox vs prod may differ). */
let cachedApiVersion: string | null = null;

function apiVersionsToTry(): string[] {
  if (cachedApiVersion) return [cachedApiVersion];
  const preferred = DEFAULT_API_VERSION;
  const candidates = [preferred, "1", "2"].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  return candidates;
}

function isVersionError(status: number, body: string, message: string | null): boolean {
  return (
    status === 300 ||
    /valid version/i.test(body) ||
    /valid version/i.test(message ?? "")
  );
}

// Module-level sequential throttle (one sync runs requests back-to-back).
let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const gap = Date.now() - lastRequestAt;
  if (gap < MIN_REQUEST_GAP_MS) await sleep(MIN_REQUEST_GAP_MS - gap);
  lastRequestAt = Date.now();
}

/**
 * Pull Agentbox's human-readable error out of a JSON error body. On a whitelist
 * failure the message contains the offending IP, e.g.
 * "The IP is not allowed for the provided API key:1.2.3.4" — surfacing it tells
 * you exactly which IP to give Reapit. Falls back to the raw body.
 */
type AgentboxErrorEnvelope = {
  errorMessage?: unknown;
  errors?: Array<{ detail?: unknown; title?: unknown }>;
};

function extractAgentboxMessage(body: string): string | null {
  if (!body) return null;
  try {
    const j = JSON.parse(body) as {
      Response?: AgentboxErrorEnvelope;
      response?: AgentboxErrorEnvelope;
      errorMessage?: unknown;
      message?: unknown;
    };
    // Old shape: { Response: { errorMessage } }.  v2 shape: { response: { errors: [{ detail }] } }.
    const env = j.Response ?? j.response;
    const firstError = env?.errors?.[0];
    const msg =
      env?.errorMessage ?? firstError?.detail ?? firstError?.title ?? j.errorMessage ?? j.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  } catch {
    /* not JSON */
  }
  return body.slice(0, 200).trim() || null;
}

type RequestOutcome =
  | { ok: true; json: unknown }
  | { ok: false; error: string; ipBlocked?: boolean };

async function agentboxRequest(
  path: string,
  creds: IntegrationCredentials,
  params: Record<string, string | number | undefined> = {},
): Promise<RequestOutcome> {
  const versions = apiVersionsToTry();
  let lastVersionError: RequestOutcome | null = null;

  for (const apiVersion of versions) {
    const url = new URL(baseUrl() + path);
    url.searchParams.set("version", apiVersion);
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }

    for (let attempt = 0; ; attempt++) {
      await throttle();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await undiciFetch(url.toString(), {
          method: "GET",
          headers: {
            "X-Client-ID": creds.clientId,
            "X-API-Key": creds.apiKey,
            Accept: "application/json",
          },
          signal: controller.signal,
          dispatcher: getProxyDispatcher(),
        });

        if (res.status === 429 && attempt < MAX_429_RETRIES) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const waitMs =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : 2 ** attempt * 1000;
          await sleep(waitMs);
          continue;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          const message = extractAgentboxMessage(body);

          if (isVersionError(res.status, body, message)) {
            lastVersionError = {
              ok: false,
              error: `Agentbox request failed (HTTP ${res.status}). ${message ?? ""}`.trim(),
            };
            break; // try next apiVersion
          }

          const ipBlocked = res.status === 403 || /ip is not allowed/i.test(body);
          if (ipBlocked) {
            return {
              ok: false,
              ipBlocked: true,
              error: message ?? `Your server IP is not whitelisted yet (HTTP ${res.status}).`,
            };
          }
          if (res.status === 401) {
            return {
              ok: false,
              error:
                message ??
                "Agentbox rejected the credentials (401). Check the Client ID and API Key.",
            };
          }
          return {
            ok: false,
            error: `Agentbox request failed (HTTP ${res.status}). ${message ?? ""}`.trim(),
          };
        }

        const json = await res.json().catch(() => null);
        cachedApiVersion = apiVersion;
        return { ok: true, json };
      } catch (e) {
        return {
          ok: false,
          ipBlocked: true,
          error:
            e instanceof Error
              ? `Could not reach Agentbox (${e.message}). The sandbox is IP-restricted — confirm our IP is whitelisted.`
              : "Could not reach Agentbox.",
        };
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return (
    lastVersionError ?? {
      ok: false,
      error: "Agentbox request failed — no valid API version accepted.",
    }
  );
}

/**
 * Pull the listing array out of Agentbox's response envelope. The v2 shape is
 * { response: { listings: { listing: [...] } } }; we also tolerate items/data
 * and a single-object result. Verify against a real 200 once whitelisted.
 */
function extractItems(json: unknown): AgentboxRawListing[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const response = (root.response ?? root.Response ?? root) as Record<string, unknown>;
  const node = (response.listings ?? response.Listings ?? response) as
    | Record<string, unknown>
    | unknown[];
  if (Array.isArray(node)) return node as AgentboxRawListing[];
  const container = node as Record<string, unknown>;
  const candidate =
    container.listing ?? container.items ?? container.listings ?? container.data;
  if (Array.isArray(candidate)) return candidate as AgentboxRawListing[];
  if (candidate && typeof candidate === "object") return [candidate as AgentboxRawListing];
  return [];
}

/** Verify credentials + IP reachability with a minimal request. */
export async function verifyAgentboxCredentials(
  creds: IntegrationCredentials,
): Promise<VerifyResult> {
  const clientIdError = validateAgentboxClientId(creds.clientId);
  if (clientIdError) {
    return { ok: false, error: clientIdError };
  }
  const res = await agentboxRequest("/listings", creds, { page: 1, limit: 1 });
  if (res.ok) return { ok: true };
  return { ok: false, error: res.error, ipBlocked: res.ipBlocked };
}

export type FetchItemsResult =
  | { ok: true; items: AgentboxRawListing[] }
  | { ok: false; error: string; ipBlocked?: boolean };

/** Fetch all (capped) business listings, following pagination. */
export async function fetchAgentboxListingItems(
  creds: IntegrationCredentials,
): Promise<FetchItemsResult> {
  const all: AgentboxRawListing[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await agentboxRequest("/listings", creds, { page, limit: PAGE_SIZE });
    if (!res.ok) {
      // If we already have some pages, return what we have; else surface the error.
      if (all.length > 0) break;
      return { ok: false, error: res.error, ipBlocked: res.ipBlocked };
    }
    const items = extractItems(res.json);
    all.push(...items);
    if (items.length < PAGE_SIZE) break; // last page
  }
  return { ok: true, items: all };
}
