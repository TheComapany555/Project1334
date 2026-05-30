// Feature #4 — pure signature HTML rendering. Split out from
// `lib/email-signatures.ts` so the broker preview UI can render signatures
// client-side without round-tripping the server (and without pulling in
// supabase / server-only imports).
//
// No I/O, no Node-only APIs. Safe to import from "use client" components.

const BRAND_PRIMARY = "#0d5c2f";
const SAFE_URL_RE = /^(https?:|mailto:|tel:)/i;

export type BrokerSignatureInput = {
  brokerName: string | null;
  brokerTitle: string | null;
  brokerPhone: string | null;
  brokerEmail: string | null;
  brokerProfileUrl: string | null;
  brokerPhotoUrl: string | null;
  agencyName: string | null;
  agencyLogoUrl: string | null;
  agencyWebsite: string | null;
  agencyDisclaimer: string | null;
  social: {
    linkedin?: string | null;
    facebook?: string | null;
    instagram?: string | null;
  } | null;
};

/**
 * Aggregated broker + agency data needed to render an auto-built signature.
 * Returned by `loadBrokerSignatureContext` (server) and used both by the
 * per-send resolver and by the client-side live preview.
 */
export type BrokerSignatureContext = {
  brokerName: string | null;
  brokerPhone: string | null;
  brokerEmail: string | null;
  brokerProfileUrl: string | null;
  brokerPhotoUrl: string | null;
  agencyName: string | null;
  agencyLogoUrl: string | null;
  agencyWebsite: string | null;
  agencyDisclaimer: string | null;
  social: {
    linkedin: string | null;
    facebook: string | null;
    instagram: string | null;
  };
  /** DB-stored signature settings — callers may choose to override these. */
  signatureTitle: string | null;
  signatureHtml: string | null;
  signatureEnabled: boolean;
};

export function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Return an escaped URL only if its scheme is one of the safe set
 * (http(s) / mailto / tel). Returns null otherwise — callers should drop
 * the link entirely when this is null. Prevents `javascript:` /
 * `data:` URLs from landing in outbound email links.
 */
function safeUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!SAFE_URL_RE.test(trimmed)) return null;
  return escapeHtml(trimmed);
}

function socialLink(href: string, label: string): string | null {
  const safeHref = safeUrl(href);
  if (!safeHref) return null;
  const safeLabel = escapeHtml(label);
  return `<a href="${safeHref}" target="_blank" rel="noopener" style="color:${BRAND_PRIMARY};text-decoration:none;font-size:13px;margin-right:12px;">${safeLabel}</a>`;
}

/**
 * Render the default broker signature as a self-contained HTML block. Uses
 * inline styles so it renders consistently in Gmail / Outlook / Apple Mail.
 */
export function buildAutoSignatureHtml(input: BrokerSignatureInput): string {
  const name = escapeHtml(input.brokerName) || "Salebiz Broker";
  const title = escapeHtml(input.brokerTitle);
  const agency = escapeHtml(input.agencyName);
  const phone = escapeHtml(input.brokerPhone);
  const email = escapeHtml(input.brokerEmail);
  const profileUrl = safeUrl(input.brokerProfileUrl);
  const logoUrl = safeUrl(input.agencyLogoUrl);
  const photoUrl = safeUrl(input.brokerPhotoUrl);
  const websiteUrl = safeUrl(input.agencyWebsite);

  const social = input.social ?? {};
  const socialLinks: string[] = [];
  if (social.linkedin) {
    const link = socialLink(social.linkedin, "LinkedIn");
    if (link) socialLinks.push(link);
  }
  if (social.facebook) {
    const link = socialLink(social.facebook, "Facebook");
    if (link) socialLinks.push(link);
  }
  if (social.instagram) {
    const link = socialLink(social.instagram, "Instagram");
    if (link) socialLinks.push(link);
  }
  const socialRow = socialLinks.length
    ? `<div style="margin-top:8px;">${socialLinks.join("")}</div>`
    : "";

  const contactRows: string[] = [];
  if (phone) {
    contactRows.push(
      `<div><a href="tel:${phone}" style="color:#555555;text-decoration:none;">${phone}</a></div>`,
    );
  }
  if (email) {
    contactRows.push(
      `<div><a href="mailto:${email}" style="color:#555555;text-decoration:none;">${email}</a></div>`,
    );
  }
  if (websiteUrl) {
    contactRows.push(
      `<div><a href="${websiteUrl}" target="_blank" rel="noopener" style="color:#555555;text-decoration:none;">${websiteUrl.replace(/^https?:\/\//i, "")}</a></div>`,
    );
  }
  if (profileUrl) {
    contactRows.push(
      `<div><a href="${profileUrl}" target="_blank" rel="noopener" style="color:${BRAND_PRIMARY};text-decoration:none;">View profile</a></div>`,
    );
  }
  const contactBlock = contactRows.length
    ? `<div style="margin-top:6px;color:#555555;">${contactRows.join("")}</div>`
    : "";

  const avatar = logoUrl || photoUrl;
  const avatarCell = avatar
    ? `<td valign="top" style="padding:0 14px 0 0;width:64px;">
         <img src="${avatar}" alt="${agency || name}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:8px;object-fit:cover;border:0;" />
       </td>`
    : "";

  const titleLine = title
    ? `<div style="color:#777777;">${title}${agency ? ` &middot; ${agency}` : ""}</div>`
    : agency
      ? `<div style="color:#777777;">${agency}</div>`
      : "";

  const disclaimer = input.agencyDisclaimer?.trim()
    ? `<p style="margin:10px 0 0 0;padding-top:10px;border-top:1px solid #eeeeee;font-size:11px;line-height:1.5;color:#999999;">${escapeHtml(input.agencyDisclaimer.trim()).replace(/\n/g, "<br>")}</p>`
    : "";

  return `
<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#333333;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      ${avatarCell}
      <td valign="top" style="vertical-align:top;">
        <div style="font-weight:700;color:#0a0a0a;font-size:14px;">${name}</div>
        ${titleLine}
        ${contactBlock}
        ${socialRow}
      </td>
    </tr>
  </table>
  ${disclaimer}
</div>`.trim();
}

/** Append a signature HTML block before the closing `</body>` tag. */
export function appendSignatureToHtml(html: string, signatureHtml: string | null): string {
  if (!signatureHtml) return html;
  const closingBody = html.lastIndexOf("</body>");
  if (closingBody === -1) return `${html}\n${signatureHtml}`;
  return `${html.slice(0, closingBody)}\n${signatureHtml}\n${html.slice(closingBody)}`;
}

/** Plain-text variant: tack the signature on after two newlines. */
export function appendSignatureToText(text: string, signaturePlain: string | null): string {
  if (!signaturePlain?.trim()) return text;
  return `${text.trimEnd()}\n\n${signaturePlain.trim()}\n`;
}

export function buildAutoSignatureText(input: {
  brokerName: string | null;
  brokerTitle: string | null;
  brokerPhone: string | null;
  brokerEmail: string | null;
  brokerProfileUrl: string | null;
  agencyName: string | null;
  agencyDisclaimer: string | null;
}): string {
  const lines: string[] = ["--"];
  const titleLine = [input.brokerName, input.brokerTitle].filter(Boolean).join(" — ");
  if (titleLine) lines.push(titleLine);
  if (input.agencyName) lines.push(input.agencyName);
  if (input.brokerPhone) lines.push(input.brokerPhone);
  if (input.brokerEmail) lines.push(input.brokerEmail);
  if (input.brokerProfileUrl) lines.push(input.brokerProfileUrl);
  if (input.agencyDisclaimer?.trim()) {
    lines.push("");
    lines.push(input.agencyDisclaimer.trim());
  }
  return lines.join("\n");
}

export function stripHtmlForText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Strip obviously-dangerous constructs from a broker-supplied custom HTML
 * signature. Defense-in-depth — email clients sanitize aggressively already,
 * and the custom HTML is only written by the broker themselves, so this is
 * not a cross-tenant exposure. We just neutralize the most common foot-guns:
 *   - <script> blocks
 *   - <iframe>/<object>/<embed>
 *   - `on*=` event-handler attributes
 *   - `javascript:` / `data:` schemes inside href / src
 */
export function sanitizeCustomSignatureHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(iframe|object|embed|meta|link)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*"\s*(javascript|data):[^"]*"/gi, ' $1="#"')
    .replace(/\s(href|src)\s*=\s*'\s*(javascript|data):[^']*'/gi, " $1='#'");
}
