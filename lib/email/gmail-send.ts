/**
 * Send an email through the broker's connected Gmail account.
 *
 * Uses the standard `gmail.users.messages.send` endpoint with a raw RFC 5322
 * MIME message base64url-encoded. The email lands in the broker's own Sent
 * folder; buyer replies come back to the broker's normal inbox.
 *
 * We construct a multipart/alternative (text + html) message so it renders
 * correctly across all clients.
 */

const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export type GmailSendInput = {
  accessToken: string;
  fromName: string | null;
  fromEmail: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html: string;
};

export type GmailSendResult =
  | { ok: true; messageId: string; threadId: string }
  | { ok: false; error: string };

export async function sendViaGmail(input: GmailSendInput): Promise<GmailSendResult> {
  const raw = buildMime(input);
  const encoded = toUrlSafeBase64(raw);

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `Gmail send failed: ${res.status} ${body.slice(0, 300)}`,
    };
  }
  const data = (await res.json()) as { id?: string; threadId?: string };
  return {
    ok: true,
    messageId: data.id ?? "",
    threadId: data.threadId ?? "",
  };
}

// ─── MIME builder ─────────────────────────────────────────────────────────

function buildMime(i: GmailSendInput): string {
  const from = i.fromName
    ? `${encodeHeaderValue(i.fromName)} <${i.fromEmail}>`
    : i.fromEmail;
  const boundary = `salebiz_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

  const headers = [
    `From: ${from}`,
    `To: ${i.to}`,
    i.replyTo ? `Reply-To: ${i.replyTo}` : null,
    `Subject: ${encodeHeaderValue(i.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  const lines = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    i.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    i.html,
    "",
    `--${boundary}--`,
    "",
  ];
  return lines.join("\r\n");
}

/** RFC 2047 encoded-word for non-ASCII characters in header values. */
function encodeHeaderValue(value: string): string {
  // ASCII-safe? Pass through quoted to avoid breaking display names with commas.
  if (/^[\x20-\x7E]*$/.test(value) && !value.includes('"')) {
    return value.includes(",") || value.includes("(") || value.includes(":")
      ? `"${value}"`
      : value;
  }
  // Otherwise UTF-8 encoded-word.
  const b64 = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function toUrlSafeBase64(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
