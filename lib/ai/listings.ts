import { getOpenAIClient, OPENAI_MODEL } from "./openai";

export type AIListingContent = {
  summary: string;
  description: string;
};

export type ListingContext = {
  title?: string | null;
  category?: string | null;
  askingPrice?: number | null;
  priceType?: "fixed" | "poa" | null;
  currency?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  highlights?: string[];
};

const SYSTEM_PROMPT = `You write copy for Salebiz, an Australian marketplace where business owners list their businesses for sale to potential investors and buyers.

Your job is to produce clear, professional, trustworthy listing content that helps a serious buyer understand the opportunity quickly.

Style rules:
- Plain Australian English. Confident and factual, never salesy or hyped.
- Avoid superlatives like "amazing", "incredible", "unbeatable".
- Avoid the em dash character. Use commas, periods, or parentheses instead.
- No emojis. No marketing cliches.
- Do not invent specific numbers (revenue, profit, customer counts, years in business) that were not provided. Speak in qualitative terms instead.
- Address the prospective buyer directly where natural.

Output:
- "summary" is one to two sentences, plain text, max 280 characters. Suitable for a listings card preview.
- "description" is 3 to 6 short paragraphs, plain text, separated by a blank line. Each paragraph 1 to 4 sentences. No headings, no bullet points, no markdown. The first paragraph should hook the reader on the opportunity. Subsequent paragraphs can cover what the business does, what makes it attractive, location and operations, and what is included in the sale, but only when that information is supported by the input.

Return ONLY a JSON object with keys "summary" and "description". No other text.`;

function describeListingContext(ctx: ListingContext): string {
  const lines: string[] = [];
  if (ctx.title) lines.push(`Listing title: ${ctx.title}`);
  if (ctx.category) lines.push(`Category: ${ctx.category}`);

  if (ctx.priceType === "poa") {
    lines.push(`Price: Price on application`);
  } else if (ctx.askingPrice && ctx.askingPrice > 0) {
    const formatted = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: (ctx.currency ?? "AUD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(ctx.askingPrice);
    lines.push(`Asking price: ${formatted}`);
  }

  const locationParts = [ctx.suburb, ctx.state, ctx.postcode].filter(Boolean);
  if (locationParts.length) lines.push(`Location: ${locationParts.join(", ")}`);

  if (ctx.highlights && ctx.highlights.length) {
    lines.push(`Highlights: ${ctx.highlights.join(", ")}`);
  }

  return lines.length ? lines.join("\n") : "(no structured details provided)";
}

function parseAIJson(raw: string | null | undefined): AIListingContent {
  if (!raw) {
    throw new Error("AI returned an empty response. Please try again.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed content. Please try again.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).summary !== "string" ||
    typeof (parsed as Record<string, unknown>).description !== "string"
  ) {
    throw new Error("AI returned content in an unexpected shape.");
  }
  const summary = ((parsed as Record<string, unknown>).summary as string).trim();
  const description = (
    (parsed as Record<string, unknown>).description as string
  ).trim();
  if (!description) {
    throw new Error("AI returned an empty description. Please try again.");
  }
  // Belt-and-braces: strip em dashes if the model slipped any in.
  return {
    summary: summary.replace(/—/g, ", "),
    description: description.replace(/—/g, ", "),
  };
}

async function callOpenAI(userPrompt: string): Promise<AIListingContent> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1200,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });
  return parseAIJson(completion.choices[0]?.message?.content);
}

/**
 * Rewrite an existing description into a more polished version. Uses any
 * provided structured context (title, category, location, etc) to ground the
 * rewrite, but the user's existing copy is the primary source of truth.
 */
export async function rewriteListingContent(input: {
  description: string;
  summary?: string | null;
  context?: ListingContext;
}): Promise<AIListingContent> {
  const original = input.description.trim();
  if (!original) {
    throw new Error(
      "Add some description text first, then click Improve with AI."
    );
  }

  const ctxBlock = input.context
    ? describeListingContext(input.context)
    : "(no structured details provided)";

  const summaryBlock = input.summary?.trim()
    ? `\n\nExisting summary (rewrite or improve):\n${input.summary.trim()}`
    : "";

  const userPrompt = `Rewrite the following business listing into clearer, more professional copy. Preserve every fact in the original. Do not invent new numbers, claims or features.

Listing details for context:
${ctxBlock}${summaryBlock}

Existing description (rewrite this):
${original}

Return JSON with keys "summary" and "description".`;

  return callOpenAI(userPrompt);
}

/**
 * Generate a brand new listing description from structured fields only.
 */
export async function generateListingContent(input: {
  context: ListingContext;
}): Promise<AIListingContent> {
  const { context } = input;

  if (!context.title?.trim()) {
    throw new Error(
      "Add a listing title first, then click Generate with AI."
    );
  }

  const ctxBlock = describeListingContext(context);

  const userPrompt = `Write a brand new business listing for the marketplace based ONLY on the structured details below. If a detail is missing, write around it qualitatively rather than inventing facts.

Listing details:
${ctxBlock}

Return JSON with keys "summary" and "description".`;

  return callOpenAI(userPrompt);
}
