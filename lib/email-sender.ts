/**
 * Shared sender identities and headers for outbound mail.
 *
 * Kept separate from `email-templates.ts` (which only builds HTML) so the
 * *envelope* — who a message is from, and the headers mailbox providers grade
 * it on — is defined in exactly one place.
 */

const RAW_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";

/** Adds a display name unless one is already configured in EMAIL_FROM. */
function withDisplayName(address: string, name: string): string {
  // Already in `Name <addr>` form — respect whatever ops configured.
  if (address.includes("<")) return address;
  return `${name} <${address}>`;
}

/**
 * Default sender for transactional mail.
 *
 * A bare `noreply@…` with no display name renders as a raw address in most
 * clients and is a mild spam signal; a stable, recognisable name is not.
 */
export const EMAIL_FROM_DEFAULT = withDisplayName(RAW_FROM, "Salebiz");

/** Sender for signup/welcome mail, which uses its own warmed address. */
export const EMAIL_FROM_WELCOME = withDisplayName(
  "welcome@salebiz.com.au",
  "Salebiz",
);

/**
 * Where human replies should land. Our from-addresses are unattended, so
 * without this a reply silently disappears — which also trains providers to
 * treat the thread as one-way bulk mail.
 */
export const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO?.trim() || "support@salebiz.com.au";

/**
 * Headers that improve inbox placement for bulk-ish mail (alerts, shares,
 * invitations). Gmail and Outlook both reward a machine-readable unsubscribe
 * path, and `List-Unsubscribe-Post` enables one-click unsubscribe, which is
 * required by Gmail's bulk-sender rules.
 *
 * Do NOT attach these to genuinely transactional mail a user asked for
 * (password resets, verification, receipts) — an unsubscribe header on those
 * is both wrong and confusing.
 */
export function bulkMailHeaders(unsubscribeUrl?: string | null): Record<string, string> {
  if (!unsubscribeUrl) return {};
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Derive a plain-text alternative from a rendered HTML email.
 *
 * Sending `text/html` alone is one of the strongest spam signals there is:
 * every legitimate bulk sender ships multipart/alternative. Rather than
 * hand-maintaining 20+ text mirrors that drift from the HTML, we generate the
 * text part from the same markup the recipient sees.
 *
 * Deliberately simple — it only has to handle our own templates, which are
 * generated markup with a known shape, not arbitrary HTML.
 */
export function htmlToPlainText(html: string): string {
  return (
    html
      // Drop everything that never carries reader-visible copy, including the
      // hidden preheader div (it would otherwise appear twice).
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<div[^>]*display:none[\s\S]*?<\/div>/gi, "")
      // Keep link targets: "label (https://…)" reads correctly in plain text.
      .replace(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_m, href: string, label: string) => {
          const text = label.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          // A linked image (the header logo) has no text — drop it entirely
          // rather than leaving a bare URL at the top of every message.
          if (!text) return "";
          // mailto:/tel: already read as the label; the scheme adds nothing.
          if (/^(mailto|tel):/i.test(href)) return text;
          // Skip the redundant "https://x (https://x)" case.
          return text === href ? href : `${text} (${href})`;
        },
      )
      // Block-level elements become line breaks.
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h1|h2|h3|tr|div|li)>/gi, "\n")
      .replace(/<\/td>/gi, "  ")
      .replace(/<li[^>]*>/gi, "- ")
      // Strip all remaining tags, then decode the entities our templates emit.
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&mdash;|&#8212;/g, "—")
      .replace(/&ndash;|&#8211;/g, "–")
      .replace(/&middot;|&#183;/g, "·")
      .replace(/&rarr;|&#8594;/g, "->")
      .replace(/&copy;|&#169;/g, "(c)")
      .replace(/&#8217;|&rsquo;/g, "’")
      .replace(/&quot;|&#34;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;|&#60;/g, "<")
      .replace(/&gt;|&#62;/g, ">")
      // `&amp;` last, so "&amp;lt;" cannot decode into a tag.
      .replace(/&amp;|&#38;/g, "&")
      // Tidy whitespace: collapse runs of blank lines, trim each line.
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
