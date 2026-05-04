import { getOpenAIClient, OPENAI_MODEL } from "./openai";
import type { AnalyticsOverview } from "@/lib/actions/analytics";
import type { AIListingInsights } from "./listing-insights";

const SYSTEM_PROMPT = `You are an analytics assistant for Salebiz, an Australian marketplace where brokers list businesses for sale.

Your audience is the BROKER. Summarise their whole portfolio (all of their listings they manage in this account) using the numbers provided.

Produce three outputs in plain Australian English:

1. "performance_summary" — one short paragraph (2 to 5 sentences, max 380 characters) on how the portfolio is performing in the selected period. Lead with headline metrics (views, enquiries, trends). Mention concentration if one listing dominates, or breadth if spread evenly. No headings, bullets, or markdown.

2. "suggested_actions" — an array of 2 to 3 practical next steps for the broker across their listings (not per listing). Each one sentence, max 160 characters, plain text.

3. "seller_update" — a short paragraph the broker could reuse when updating sellers or stakeholders about overall activity this period. Plain text, max 480 characters. Do not use a single seller name; refer to "your listing(s)" or "the businesses we have listed" as appropriate. No emojis or markdown.

Style: factual, calm, confident. No em dash characters (use commas instead). Do not invent metrics. Use the numbers exactly as supplied.

Return ONLY JSON with keys "performance_summary" (string), "suggested_actions" (string[]), and "seller_update" (string).`;

function describeOverviewForPrompt(o: AnalyticsOverview): string {
  const lines: string[] = [];
  lines.push(`Selected period: last ${o.period_days} days (KPIs and daily chart are for this window).`);
  lines.push(`Period totals: ${o.total_views} views (${o.web_views} web, ${o.mobile_views} mobile), ${o.enquiries} enquiries, ${o.calls} phone call clicks.`);
  lines.push(
    `Engagement rate this period: ${o.engagement_rate}% (enquiries per 100 views).`,
  );
  if (o.avg_duration_seconds != null) {
    lines.push(`Average time on page this period: ${o.avg_duration_seconds} seconds.`);
  }
  lines.push(
    `Trend vs previous period: views ${o.views_trend != null ? `${o.views_trend > 0 ? "+" : ""}${o.views_trend}%` : "n/a"}, enquiries ${o.enquiries_trend != null ? `${o.enquiries_trend > 0 ? "+" : ""}${o.enquiries_trend}%` : "n/a"}.`,
  );
  lines.push(
    `All-time portfolio totals: ${o.calls_total} call clicks, ${o.saves_total} saves, ${o.nda_sigs_total} NDA signatures.`,
  );
  lines.push("");
  lines.push("Per-listing breakdown (views and engagement are all-time; enquiries column is all-time):");
  const rows = o.per_listing.slice(0, 15);
  if (rows.length === 0) {
    lines.push("(No listings.)");
  } else {
    for (const r of rows) {
      lines.push(
        `- ${r.title}: ${r.views} views (${r.web_views} web / ${r.mobile_views} mobile), ${r.enquiries} enquiries, ${r.saves} saves, ${r.nda_sigs} NDAs signed, engagement ${r.engagement_rate}%`,
      );
    }
    if (o.per_listing.length > 15) {
      lines.push(`... and ${o.per_listing.length - 15} more listing(s).`);
    }
  }
  return lines.join("\n");
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
  const summary =
    typeof obj.performance_summary === "string"
      ? obj.performance_summary.trim()
      : "";
  const sellerUpdate =
    typeof obj.seller_update === "string" ? obj.seller_update.trim() : "";
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

export async function generateBrokerAccountInsights(
  overview: AnalyticsOverview,
): Promise<AIListingInsights> {
  if (overview.per_listing.length === 0) {
    return {
      performance_summary:
        "You do not have any listings in this account yet. Create and publish a listing to start tracking views, enquiries, and engagement here.",
      suggested_actions: [
        "Add your first listing with a clear title, strong summary, and quality photos.",
        "Publish and share the link with your buyer database to seed early traffic.",
        "Come back to this analytics page once the listing is live to review trends.",
      ],
      seller_update:
        "Hi, we are ready to load your business onto the marketplace as soon as you give us the green light. Once it is live, I will share weekly numbers on views and enquiries so you can see buyer interest in real time.",
    };
  }

  const periodQuiet =
    overview.total_views === 0 &&
    overview.enquiries === 0 &&
    overview.calls === 0;

  if (periodQuiet) {
    return {
      performance_summary: `Across your ${overview.per_listing.length} listing(s), there were no views or enquiries in the last ${overview.period_days} days. Your listings are still visible to buyers; consider promoting them to restart momentum.`,
      suggested_actions: [
        "Share top listings with your contact list and on social channels to lift traffic.",
        "Review titles and lead photos for the listings with the lowest historical engagement.",
        "Follow up on any saved buyers or past enquiries while activity is quiet.",
      ],
      seller_update:
        "Hi, activity across the listings we have on the platform has been quiet in the last couple of weeks. I am lining up more promotion and follow-ups with interested buyers to bring fresh eyes to your business.",
    };
  }

  const userPrompt = `Here is the broker's portfolio analytics:\n\n${describeOverviewForPrompt(overview)}\n\nReturn JSON with keys "performance_summary", "suggested_actions", and "seller_update".`;

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.45,
    max_tokens: 900,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return parseInsightsJson(completion.choices[0]?.message?.content);
}
