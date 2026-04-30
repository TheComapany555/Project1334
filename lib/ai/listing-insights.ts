import { getOpenAIClient, OPENAI_MODEL } from "./openai";
import type { ListingInsightsMetrics } from "@/lib/actions/listing-insights";

export type AIListingInsights = {
  performance_summary: string;
  suggested_actions: string[];
  seller_update: string;
};

const SYSTEM_PROMPT = `You are an analytics assistant for Salebiz, an Australian marketplace where business owners list their businesses for sale through brokers.

Your audience is the BROKER, not the buyer. Your job is to read the listing's recent performance numbers and produce three things in plain Australian English:

1. "performance_summary" — one short paragraph (2 to 4 sentences, max 320 characters) describing how the listing is performing this month. Lead with the actual numbers. Be factual, not hyped. Mention the most relevant signals (views, enquiries, NDA requests, repeat visitors). Suitable for the broker to read and forward to a seller. No headings. No bullet points. No markdown.

2. "suggested_actions" — an array of 2 to 3 short, practical, numbers-driven recommendations the broker could take next. Each item is one sentence, plain text, max 160 characters. Examples of the kind of guidance to produce:
   - "Follow up with the 3 buyers who requested NDAs but haven't signed yet."
   - "248 views with only 6 NDA requests suggests price friction. Consider revisiting the asking price."
   - "Send updated financials to NDA-signed buyers to push toward an offer."
   Tailor them to the actual numbers. If the listing has no activity, suggest improving exposure, not buyer follow-ups.

3. "seller_update" — a ready-to-send professional message the broker can copy and paste straight to their seller. Plain text. Open with "Hi [Seller Name]," and close with no signature. Include the real numbers inline. 2 to 4 sentences, max 480 characters. Tone: confident, calm, factual. No emojis. No marketing fluff.

Style rules across all three outputs:
- Plain Australian English. Confident and factual. Never salesy.
- Avoid em dash characters; use commas, periods, or parentheses instead.
- Do not invent metrics that were not provided. Use the numbers exactly as supplied.
- Do not invent a seller name; always write the literal placeholder "[Seller Name]".
- No emojis. No markdown. No headings.

Return ONLY a JSON object with keys "performance_summary" (string), "suggested_actions" (string[]), and "seller_update" (string). No other text.`;

function describeMetricsForPrompt(input: ListingInsightsMetrics): string {
  const m = input.metrics;
  const parts: string[] = [];
  parts.push(`Listing title: ${input.listing.title}`);
  if (input.listing.category) parts.push(`Category: ${input.listing.category}`);
  const loc = [input.listing.suburb, input.listing.state]
    .filter(Boolean)
    .join(", ");
  if (loc) parts.push(`Location: ${loc}`);
  if (input.listing.price_type === "poa") {
    parts.push(`Asking price: Price on application`);
  } else if (input.listing.asking_price && input.listing.asking_price > 0) {
    const fmt = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(input.listing.asking_price);
    parts.push(`Asking price: ${fmt}`);
  }
  parts.push("");
  parts.push(`Performance over the last ${input.period_days} days (unless noted):`);
  parts.push(`- Total views: ${m.total_views}`);
  parts.push(`- Unique visitors: ${m.unique_visitors}`);
  parts.push(`- Repeat visitors: ${m.repeat_visitors}`);
  parts.push(`- Enquiries: ${m.enquiries}`);
  parts.push(`- Phone call clicks: ${m.calls}`);
  parts.push(`- NDA requests (all time): ${m.nda_requests}`);
  parts.push(`- NDA signed (all time): ${m.nda_signed}`);
  parts.push(`- Documents viewed (all time): ${m.documents_viewed}`);
  parts.push(`- Saved by buyers (all time): ${m.saved_listings}`);
  parts.push(`- Days live: ${m.days_live}`);

  const ndaPending = Math.max(0, m.nda_requests - m.nda_signed);
  if (ndaPending > 0) {
    parts.push(
      `- Note: ${ndaPending} buyer(s) requested an NDA but have not signed yet.`,
    );
  }
  if (input.hot_buyers.length > 0) {
    const ndaSignedBuyers = input.hot_buyers.filter((b) =>
      b.signals.includes("nda_signed"),
    ).length;
    const repeatBuyers = input.hot_buyers.filter((b) =>
      b.signals.includes("multiple_visits"),
    ).length;
    parts.push(
      `- Hot buyer signals: ${input.hot_buyers.length} buyer(s) flagged (${ndaSignedBuyers} NDA-signed, ${repeatBuyers} returning).`,
    );
  }

  return parts.join("\n");
}

function parseInsightsJson(raw: string | null | undefined): AIListingInsights {
  if (!raw) throw new Error("AI returned an empty response. Please try again.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed content. Please try again.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI returned content in an unexpected shape.");
  }
  const obj = parsed as Record<string, unknown>;
  const summary = typeof obj.performance_summary === "string"
    ? obj.performance_summary.trim()
    : "";
  const sellerUpdate = typeof obj.seller_update === "string"
    ? obj.seller_update.trim()
    : "";
  const actionsRaw = Array.isArray(obj.suggested_actions)
    ? obj.suggested_actions
    : [];
  const actions = actionsRaw
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!summary || !sellerUpdate || actions.length === 0) {
    throw new Error("AI returned incomplete insights. Please try again.");
  }

  const stripDash = (s: string) => s.replace(/—/g, ", ");
  return {
    performance_summary: stripDash(summary),
    suggested_actions: actions.map(stripDash),
    seller_update: stripDash(sellerUpdate),
  };
}

export async function generateListingInsights(
  input: ListingInsightsMetrics,
): Promise<AIListingInsights> {
  // No-activity short-circuit: don't burn API calls on empty data.
  const m = input.metrics;
  const totalSignal =
    m.total_views +
    m.enquiries +
    m.calls +
    m.nda_requests +
    m.nda_signed +
    m.saved_listings;
  if (totalSignal === 0) {
    return {
      performance_summary: `${input.listing.title} has been live for ${m.days_live} day${m.days_live === 1 ? "" : "s"} with no buyer activity yet. The listing has not received any views, enquiries, or saves in the last ${input.period_days} days.`,
      suggested_actions: [
        "Share the listing with your existing contact list to drive initial traffic.",
        "Review the listing title, summary, and photos to make sure they read well to a buyer.",
        "Consider featuring the listing on the homepage or category page to lift exposure.",
      ],
      seller_update: `Hi [Seller Name], your listing has been live for ${m.days_live} day${m.days_live === 1 ? "" : "s"}. We have not seen buyer activity yet, so we are working on driving more eyes to the listing this week. I'll be in touch as soon as we have movement.`,
    };
  }

  const userPrompt = `Generate broker-facing AI insights for the listing below.

${describeMetricsForPrompt(input)}

Return JSON with keys "performance_summary" (string), "suggested_actions" (string[]), and "seller_update" (string).`;

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return parseInsightsJson(completion.choices[0]?.message?.content);
}
