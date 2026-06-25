/**
 * Sumsub SANDBOX end-to-end trigger.
 *
 * Creates a sandbox applicant and (optionally) forces a review result, which
 * makes Sumsub deliver a REAL applicantReviewed webhook to your registered
 * webhook URL — the definitive "is delivery working" proof, no browser needed.
 *
 * If you pass a real broker_contacts.id as the externalUserId (and the KYB
 * migration is applied on that deployment's DB), the webhook will update that
 * buyer's Know Your Buyer tab for real.
 *
 * Usage:
 *   npx tsx scripts/sumsub-sandbox-simulate.ts [externalUserId] [GREEN|RED]
 *
 * Reads .env (SUMSUB_APP_TOKEN / SUMSUB_SECRET_KEY / SUMSUB_LEVEL_NAME).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createHmac } from "node:crypto";

function loadEnvFile(name: string) {
  const p = resolve(process.cwd(), name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const BASE = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
const TOKEN = process.env.SUMSUB_APP_TOKEN!;
const SECRET = process.env.SUMSUB_SECRET_KEY!;
const LEVEL = process.env.SUMSUB_LEVEL_NAME!;

async function api(method: "GET" | "POST", path: string, body?: unknown) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const sig = createHmac("sha256", SECRET).update(ts + method + path + bodyStr).digest("hex");
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-App-Token": TOKEN,
      "X-App-Access-Ts": ts,
      "X-App-Access-Sig": sig,
    },
    body: body === undefined ? undefined : bodyStr,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : {} };
}

async function main() {
  if (!TOKEN || !SECRET || !LEVEL) {
    console.error("✗ Missing SUMSUB_APP_TOKEN / SUMSUB_SECRET_KEY / SUMSUB_LEVEL_NAME in .env");
    process.exit(1);
  }
  const externalUserId = process.argv[2] || `webhook-proof-${Date.now()}`;
  const answer = (process.argv[3] || "GREEN").toUpperCase() === "RED" ? "RED" : "GREEN";

  console.log(`\nLevel: ${LEVEL}   externalUserId: ${externalUserId}   result: ${answer}\n`);

  // 1) Create applicant (lands in "init").
  const created = await api("POST", `/resources/applicants?levelName=${encodeURIComponent(LEVEL)}`, {
    externalUserId,
  });
  if (!created.ok) {
    console.error(`✗ Create applicant failed (${created.status}):`, JSON.stringify(created.json).slice(0, 300));
    process.exit(1);
  }
  const applicantId = created.json.id;
  console.log(`✓ Applicant created: ${applicantId}  (status: ${created.json.review?.reviewStatus ?? "init"})`);
  console.log("  → You now have an applicant in 'init'; the cockpit Test button will work too.");

  // 2) Force the final review result → fires a REAL applicantReviewed webhook.
  const simBody =
    answer === "RED"
      ? { reviewAnswer: "RED", reviewRejectType: "FINAL", rejectLabels: ["FORGERY"] }
      : { reviewAnswer: "GREEN" };
  const sim = await api(
    "POST",
    `/resources/applicants/${applicantId}/status/testCompleted`,
    simBody,
  );
  if (!sim.ok) {
    console.error(`\n⚠ Simulate result failed (${sim.status}): ${JSON.stringify(sim.json).slice(0, 300)}`);
    console.error("  (Some levels require submitted docs first. The applicant still exists for the cockpit Test button.)");
    process.exit(0);
  }
  console.log(`\n✓ Forced result = ${answer}. Sumsub will now POST applicantReviewed to your registered webhook URL.`);
  console.log("  → Check Sumsub → Dev space → Webhooks → delivery log: expect HTTP 200.");
  console.log(`  → If externalUserId was a real contact id (+ migration applied), that buyer's KYB tab updates to ${answer === "RED" ? "Rejected" : "Approved"}.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
