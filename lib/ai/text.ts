import { getOpenAIClient, OPENAI_MODEL } from "./openai";

/**
 * One AI text-writer kind per "purpose" in the app. Adding a new kind:
 *   1. Add the literal here
 *   2. Add an entry to KIND_CONFIG below with prompt + length guidance
 *   3. Drop <AITextActions kind="..." /> into the matching form
 */
export type AITextKind =
  | "broker_bio"
  | "agency_bio"
  | "outreach_listing_share"
  | "outreach_bulk_send"
  | "ad_copy";

export type AIMode = "rewrite" | "generate";

export type AITextResult = { text: string };

type KindConfig = {
  /** Short label used in dialog title / button hover */
  label: string;
  /** What is this text used for (sent to the model as part of the system prompt) */
  purpose: string;
  /** Style guidance per kind (sent to the model as part of the system prompt) */
  style: string;
  /** Soft length guidance shown to the model and used for max_tokens */
  lengthGuidance: string;
  /** Token cap (covers ~4x chars) */
  maxTokens: number;
  /** Both modes by default; set to false to disable one button */
  enableRewrite?: boolean;
  enableGenerate?: boolean;
};

const SHARED_RULES = `
Style rules (always apply):
- Plain Australian English. Confident and factual, never salesy or hyped.
- Avoid superlatives like "amazing", "incredible", "unbeatable".
- Avoid the em dash character. Use commas, periods, or parentheses instead.
- No emojis. No marketing cliches.
- Do not invent specific facts (numbers, years, accolades, locations) that were not provided. Speak qualitatively when a fact is missing.
- Output plain text only, no markdown, no headings, no bullet points.
`.trim();

export const KIND_CONFIG: Record<AITextKind, KindConfig> = {
  broker_bio: {
    label: "Broker bio",
    purpose:
      "A public bio shown on a business broker's profile in the Salebiz marketplace. Read by potential business buyers deciding whether to enquire through this broker.",
    style:
      "Professional and trust-building. Third person. Highlight expertise and what buyers can expect when working with the broker.",
    lengthGuidance: "2 to 3 short paragraphs (around 80 to 160 words total).",
    maxTokens: 500,
  },
  agency_bio: {
    label: "Agency bio",
    purpose:
      "A public description of a business brokerage agency on its profile page. Read by sellers choosing who to list with and buyers evaluating credibility.",
    style:
      "Confident and professional. Cover what the agency does and who it serves. Keep it tight and credible.",
    lengthGuidance: "2 to 3 short paragraphs (around 80 to 160 words total).",
    maxTokens: 500,
  },
  outreach_listing_share: {
    label: "Listing share message",
    purpose:
      "A short personal note from a broker shown at the top of an email when sharing a single listing with a known contact (a potential buyer).",
    style:
      "Warm, personal, first person, direct. Invite them to take a look without pressure. Reference the listing only briefly (the email already contains the listing card).",
    lengthGuidance:
      "2 to 4 sentences. Under 600 characters. No greeting line, no signature.",
    maxTokens: 220,
  },
  outreach_bulk_send: {
    label: "Outreach note",
    purpose:
      "A short personal note from a broker shown at the top of an email when sharing several listings with multiple contacts at once.",
    style:
      "Warm, friendly, first person. Acknowledge that several listings are attached. No greeting line, no signature.",
    lengthGuidance: "2 to 4 sentences. Under 500 characters.",
    maxTokens: 220,
  },
  ad_copy: {
    label: "Ad copy",
    purpose:
      "Short marketing copy for an in-app advertisement on the Salebiz marketplace.",
    style:
      "Punchy and benefit-led. One clear value proposition. No call-to-action button text (the UI provides that).",
    lengthGuidance: "1 to 2 sentences. Under 280 characters.",
    maxTokens: 180,
  },
};

function buildSystemPrompt(cfg: KindConfig): string {
  return `You write copy for Salebiz, an Australian marketplace where business owners list their businesses for sale to potential investors and buyers.

Purpose of this text:
${cfg.purpose}

Style for this text:
${cfg.style}

Length:
${cfg.lengthGuidance}

${SHARED_RULES}

Return ONLY a JSON object with one key "text" containing the final copy as a plain string. Use \\n\\n for paragraph breaks. No other keys, no explanation.`;
}

function describeContext(context: Record<string, unknown> | undefined): string {
  if (!context) return "(no extra context provided)";
  const lines: string[] = [];
  for (const [key, value] of Object.entries(context)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      const filtered = value.filter(Boolean);
      if (!filtered.length) continue;
      lines.push(`${humanise(key)}: ${filtered.join(", ")}`);
    } else if (typeof value === "object") {
      lines.push(`${humanise(key)}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${humanise(key)}: ${String(value)}`);
    }
  }
  return lines.length ? lines.join("\n") : "(no extra context provided)";
}

function humanise(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseAIJson(raw: string | null | undefined): AITextResult {
  if (!raw) throw new Error("AI returned an empty response. Please try again.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed content. Please try again.");
  }
  const text = (parsed as Record<string, unknown>)?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("AI returned empty content. Please try again.");
  }
  // Belt-and-braces: strip em dashes if the model slipped any in.
  return { text: text.trim().replace(/—/g, ", ") };
}

async function callOpenAI(
  cfg: KindConfig,
  userPrompt: string
): Promise<AITextResult> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: cfg.maxTokens,
    messages: [
      { role: "system", content: buildSystemPrompt(cfg) },
      { role: "user", content: userPrompt },
    ],
  });
  return parseAIJson(completion.choices[0]?.message?.content);
}

export async function rewriteText(input: {
  kind: AITextKind;
  text: string;
  context?: Record<string, unknown>;
}): Promise<AITextResult> {
  const cfg = KIND_CONFIG[input.kind];
  if (!cfg) throw new Error("Unknown content kind.");

  const original = input.text.trim();
  if (!original) {
    throw new Error("Add some text first, then click Improve with AI.");
  }

  const userPrompt = `Rewrite the following ${cfg.label.toLowerCase()} into clearer, more professional copy. Preserve every fact in the original. Do not invent new facts.

Context:
${describeContext(input.context)}

Existing text (rewrite this):
${original}

Return JSON: { "text": "..." }`;

  return callOpenAI(cfg, userPrompt);
}

export async function generateText(input: {
  kind: AITextKind;
  context?: Record<string, unknown>;
}): Promise<AITextResult> {
  const cfg = KIND_CONFIG[input.kind];
  if (!cfg) throw new Error("Unknown content kind.");

  const userPrompt = `Write a brand new ${cfg.label.toLowerCase()} based ONLY on the context below. If a detail is missing, write around it qualitatively rather than inventing facts.

Context:
${describeContext(input.context)}

Return JSON: { "text": "..." }`;

  return callOpenAI(cfg, userPrompt);
}
