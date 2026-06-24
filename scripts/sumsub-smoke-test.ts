/**
 * Sumsub credentials smoke test (sandbox).
 *
 * Validates SUMSUB_APP_TOKEN / SUMSUB_SECRET_KEY / SUMSUB_LEVEL_NAME and the
 * request-signing scheme by generating a real verification link against the
 * Sumsub sandbox — WITHOUT needing the DB migration or a public webhook URL.
 *
 * Self-contained (mirrors lib/sumsub.ts) so it runs even if path aliases aren't
 * wired for tsx.
 *
 * Run from project root:  npx tsx scripts/sumsub-smoke-test.ts
 * Reads .env then .env.local (later wins), like the other scripts here.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createHmac } from "node:crypto";

function loadEnvFile(name: string) {
  const p = resolve(process.cwd(), name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); // skip comments/blank
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SECRET = process.env.SUMSUB_SECRET_KEY;
const LEVEL = process.env.SUMSUB_LEVEL_NAME;
const COMPANY_LEVEL = process.env.SUMSUB_COMPANY_LEVEL_NAME;

async function signedFetch(method: "GET" | "POST", path: string, body?: unknown) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const sig = createHmac("sha256", SECRET!)
    .update(ts + method + path + bodyStr)
    .digest("hex");
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN!,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": sig,
    },
    body: body === undefined ? undefined : bodyStr,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  console.log(`\nSumsub smoke test → ${BASE_URL}`);
  const missing = [
    ["SUMSUB_APP_TOKEN", APP_TOKEN],
    ["SUMSUB_SECRET_KEY", SECRET],
    ["SUMSUB_LEVEL_NAME", LEVEL],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`\n✗ Missing env vars: ${missing.join(", ")}`);
    console.error("  Fill them in .env (see .env.example) and re-run.\n");
    process.exit(1);
  }
  console.log(`  App token: ${APP_TOKEN!.slice(0, 12)}…  Level: ${LEVEL}`);

  // 1) Individual verification link.
  const externalUserId = "smoke-test-buyer";
  const params = new URLSearchParams({
    ttlInSecs: "3600",
    externalUserId,
    lang: "en",
  });
  try {
    const data = await signedFetch(
      "POST",
      `/resources/sdkIntegrations/levels/${encodeURIComponent(LEVEL!)}/websdkLink?${params}`,
    );
    console.log(`\n✓ Individual link generated:\n  ${data.url}`);
    console.log("  → Open it in a browser; you should see the Sumsub flow.");
  } catch (e) {
    console.error(`\n✗ Could not generate individual link: ${(e as Error).message}`);
    console.error("  Common causes: wrong level name, token/secret mismatch, or");
    console.error("  the token lacks permissions. Double-check Step 1 & 2.\n");
    process.exit(1);
  }

  // 2) Company applicant (only if a company level is configured).
  if (COMPANY_LEVEL) {
    try {
      const created = await signedFetch(
        "POST",
        `/resources/applicants?levelName=${encodeURIComponent(COMPANY_LEVEL)}`,
        {
          externalUserId: "smoke-test-company",
          type: "company",
          companyInfo: { companyName: "Smoke Test Pty Ltd", country: "AUS" },
        },
      );
      console.log(`\n✓ Company applicant created: ${created.id}`);
    } catch (e) {
      console.error(`\n⚠ Company level set but applicant create failed: ${(e as Error).message}`);
      console.error("  KYB may not be enabled on this sandbox — that's OK for Phase 1.");
    }
  } else {
    console.log("\n· Company level not set (SUMSUB_COMPANY_LEVEL_NAME) — skipping KYB check.");
  }

  console.log("\nDone. Credentials + signing look good.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
