/**
 * Local Sumsub webhook-handler test — no tunnel / no real Sumsub needed.
 *
 * Crafts a correctly-signed `applicantReviewed` event and POSTs it to the
 * running app's /api/sumsub/webhook, so we can verify signature checking +
 * status update + broker notification end-to-end against your local DB.
 *
 * Prereqs: migrations applied, `npm run dev` running, and SUMSUB_WEBHOOK_SECRET
 * set in .env (any value — we sign with the same one). The contactId must be a
 * real broker_contacts.id (the handler creates/updates its kyb_buyer_identity).
 *
 * Usage:
 *   npx tsx scripts/sumsub-webhook-test.ts <contactId> [GREEN|RED] [url]
 *   # company event:
 *   npx tsx scripts/sumsub-webhook-test.ts company:<contactId>:<listingId> GREEN
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

async function main() {
  const externalUserId = process.argv[2];
  const answer = (process.argv[3] || "GREEN").toUpperCase();
  const url =
    process.argv[4] || "http://localhost:3000/api/sumsub/webhook";
  const secret = process.env.SUMSUB_WEBHOOK_SECRET;

  if (!externalUserId) {
    console.error(
      "\nUsage: npx tsx scripts/sumsub-webhook-test.ts <contactId|company:contactId:listingId> [GREEN|RED] [url]\n",
    );
    process.exit(1);
  }
  if (!secret) {
    console.error("\n✗ SUMSUB_WEBHOOK_SECRET is not set in .env — set any value and re-run.\n");
    process.exit(1);
  }

  const payload = {
    applicantId: "sbx-test-applicant-" + externalUserId.slice(-8),
    inspectionId: "sbx-test-inspection",
    correlationId: "sbx-test-correlation",
    externalUserId,
    type: "applicantReviewed",
    reviewResult: {
      reviewAnswer: answer === "RED" ? "RED" : "GREEN",
      ...(answer === "RED" ? { reviewRejectType: "FINAL" } : {}),
    },
  };
  const body = JSON.stringify(payload);
  const digest = createHmac("sha256", secret).update(body).digest("hex");

  console.log(`\nPOST ${url}`);
  console.log(`  externalUserId: ${externalUserId}  answer: ${answer}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payload-digest": digest,
      "x-payload-digest-alg": "HMAC_SHA256_HEX",
    },
    body,
  });
  const text = await res.text();
  console.log(`\n${res.ok ? "✓" : "✗"} ${res.status} ${text}`);
  console.log(
    res.ok
      ? "\nCheck the buyer's Know Your Buyer tab — status should be " +
          (answer === "RED" ? "Rejected" : "Approved") +
          ", and the broker should have a new notification.\n"
      : "\n(400 = signature rejected — confirm SUMSUB_WEBHOOK_SECRET matches the running app.)\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
