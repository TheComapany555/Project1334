/**
 * Branded email templates for Salebiz.com.au.
 *
 * Every template composes the shared `baseLayout` plus the helpers below, so
 * the type scale, spacing and colours are defined once here rather than being
 * restated per template. Change them here and all templates follow.
 *
 * Email-HTML constraints these helpers respect, because clients are not
 * browsers: table-based layout, inline styles only (no <style> beyond the MSO
 * hack and a media query), no flex/grid, no SVG images, and every colour
 * written as a plain hex so Outlook does not drop it.
 */

import { SALEBIZ_EMAIL_LOGO_URL } from "@/lib/branding";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const BRAND_PRIMARY = "#0d5c2f";

/** Ink scale. Body copy sits at INK_BODY — 4.5:1+ on white. */
const INK_TITLE = "#0f1c14";
const INK_BODY = "#333d36";
const INK_MUTED = "#5f6b63";
const INK_FAINT = "#8a938c";

const SURFACE_PAGE = "#eef1ef";
const SURFACE_CARD = "#ffffff";
const SURFACE_INSET = "#f6f8f7";
const BORDER_SOFT = "#e2e7e4";

/** Body text at 17px: comfortably readable on a phone without zooming. */
const TEXT_BODY = "17px";
const LINE_BODY = "1.65";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * Escape user-controlled strings before interpolating into HTML email
 * bodies. Real email clients sanitize aggressively but treating these
 * strings as trusted lets an admin or agency owner inject structural
 * markup (or `<img src=x onerror=…>` in some webmail UIs) into a name
 * or listing title. Defense-in-depth.
 */
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/*  Base layout                                                        */
/* ------------------------------------------------------------------ */

/**
 * Shared shell for every Salebiz email.
 *
 * `preheader` is the snippet Gmail and Apple Mail show next to the subject in
 * the message list. Left unset, clients scrape the first visible text — which
 * used to be the logo's alt text. Passing one sentence here is also a real
 * deliverability signal: messages whose preview text is missing or duplicates
 * the subject score worse.
 */
function baseLayout(content: string, preheader?: string): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Salebiz</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>table,td,p,a,h1{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
  <style>
    /* Phones: trim the gutters so the card keeps its measure. */
    @media only screen and (max-width:600px){
      .sb-shell{padding:16px 10px!important}
      .sb-pad{padding-left:24px!important;padding-right:24px!important}
      .sb-title{font-size:26px!important;line-height:1.22!important}
      .sb-cta a{display:block!important}
    }
    /* Never let a client invert our white card to a muddy grey. */
    @media (prefers-color-scheme:dark){
      .sb-card{background-color:${SURFACE_CARD}!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${SURFACE_PAGE};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  ${
    preheader
      ? `<div style="display:none;font-size:1px;color:${SURFACE_PAGE};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
      : ""
  }

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SURFACE_PAGE};">
    <tr>
      <td align="center" class="sb-shell" style="padding:40px 16px;">

        <!-- Logo sits above the card: no boxed-in header band. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td align="left" style="padding:0 4px 20px 4px;">
              <a href="https://salebiz.com.au" target="_blank" style="text-decoration:none;border:0;">
                <img src="${SALEBIZ_EMAIL_LOGO_URL}" alt="Salebiz.com.au" width="210" height="26" style="display:block;width:210px;height:26px;max-width:210px;border:0;outline:none;text-decoration:none;" />
              </a>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="sb-card" style="max-width:600px;background-color:${SURFACE_CARD};border:1px solid ${BORDER_SOFT};border-radius:14px;">
          <tr>
            <td class="sb-pad" style="padding:44px 40px 40px 40px;color:${INK_BODY};font-size:${TEXT_BODY};line-height:${LINE_BODY};">
              ${content}
            </td>
          </tr>
        </table>
        <!-- /Card -->

        <!-- Footer sits outside the card, quiet by design. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:26px 24px 8px 24px;">
              <p style="margin:0 0 8px 0;color:${INK_MUTED};font-size:16px;line-height:1.6;">
                &copy; ${year} Salebiz.com.au &mdash; Australia&#8217;s business marketplace
              </p>
              <p style="margin:0;color:${INK_FAINT};font-size:15px;line-height:1.6;">
                This is an automated message, so replies to it aren&#8217;t monitored.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

/**
 * Standard opening of a message: a large title, optionally followed by one
 * supporting line. Replaces the ad-hoc 20px/14px `<p>` pair each template used
 * to hand-roll, so the scale is consistent everywhere.
 */
function heading(title: string, subtitle?: string): string {
  return `<h1 class="sb-title" style="margin:0 0 ${subtitle ? "10px" : "22px"} 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">${title}</h1>${
    subtitle
      ? `<p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">${subtitle}</p>`
      : ""
  }`;
}

/** Body paragraph. Use for prose so the measure and rhythm stay uniform. */
function paragraph(html: string): string {
  return `<p style="margin:0 0 18px 0;color:${INK_BODY};font-size:${TEXT_BODY};line-height:${LINE_BODY};">${html}</p>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="sb-cta" style="margin:30px 0 26px 0;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:${BRAND_PRIMARY};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="19%" stroke="f" fillcolor="${BRAND_PRIMARY}">
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 38px;color:#ffffff;font-size:17px;font-weight:600;line-height:1.2;text-decoration:none;border-radius:10px;background-color:${BRAND_PRIMARY};mso-hide:all;">${label}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function secondaryLink(href: string, label: string): string {
  return `<a href="${href}" target="_blank" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:underline;">${label}</a>`;
}

/** One label/value pair inside a details panel. */
function infoRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:11px 0 11px 0;color:${INK_MUTED};font-size:17px;font-weight:600;white-space:nowrap;vertical-align:top;width:34%;">${label}</td>
  <td style="padding:11px 0 11px 0;color:${INK_TITLE};font-size:16px;line-height:1.5;vertical-align:top;">${value}</td>
</tr>`;
}

/**
 * Wraps `infoRow`s in an inset panel. Templates previously each declared their
 * own table shell with slightly different padding and borders; this makes the
 * details block identical across every email.
 */
function infoPanel(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 26px 0;background-color:${SURFACE_INSET};border:1px solid ${BORDER_SOFT};border-radius:12px;">
  <tr>
    <td style="padding:8px 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td>
  </tr>
</table>`;
}

/** A quoted message or note from a person, set apart from our own copy. */
function quoteBlock(label: string, body: string): string {
  return `<p style="margin:0 0 8px 0;color:${INK_MUTED};font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;">${label}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 26px 0;background-color:${SURFACE_INSET};border-left:3px solid ${BRAND_PRIMARY};border-radius:0 10px 10px 0;">
  <tr>
    <td style="padding:16px 20px;color:${INK_BODY};font-size:16px;line-height:1.65;white-space:pre-line;">${body}</td>
  </tr>
</table>`;
}

/** Small print: expiry notes, "ignore this if…", fallback links. */
function fineprint(html: string): string {
  return `<p style="margin:0 0 10px 0;color:${INK_MUTED};font-size:16px;line-height:1.6;">${html}</p>`;
}

/** Copy-paste fallback for a CTA, for clients that strip buttons. */
function fallbackUrl(url: string): string {
  return `<p style="margin:18px 0 0 0;padding:14px 16px;background-color:${SURFACE_INSET};border-radius:8px;color:${INK_FAINT};font-size:15px;line-height:1.6;word-break:break-all;">
  Or paste this link into your browser:<br><span style="color:${INK_MUTED};">${url}</span>
</p>`;
}

/* ------------------------------------------------------------------ */
/*  Email: Verification                                                */
/* ------------------------------------------------------------------ */

/** Plain-text mirror of {@link verificationEmail}. Sending multipart improves deliverability. */
export function verificationEmailText(verifyUrl: string, name: string): string {
  return [
    `Hi ${name},`,
    "",
    "Welcome to Salebiz! Confirm your email address to activate your account:",
    "",
    verifyUrl,
    "",
    "If you didn't sign up, you can safely ignore this email.",
    "",
    "— The Salebiz team",
  ].join("\n");
}

export function verificationEmail(verifyUrl: string, name: string): string {
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      Welcome to Salebiz!
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      You&#8217;re just one step away from getting started.
    </p>

    <p style="margin:0 0 8px 0;">Hi ${esc(name)},</p>
    <p style="margin:0 0 4px 0;">
      Thanks for signing up. Please confirm your email address to activate your account.
    </p>

    ${ctaButton(verifyUrl, "Verify my email")}

    <p style="margin:0 0 4px 0;font-size:15px;color:${INK_MUTED};">
      This link will expire in <strong>24 hours</strong>. If you didn&#8217;t create an account, you can safely ignore this email.
    </p>

    ${fallbackUrl(verifyUrl)}
  `);
}

/** Mobile app — buyer account email verification (6-digit code, no link). */
export function mobileUserOtpEmail(code: string, name: string): string {
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      Your verification code
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      Enter this code in the Salebiz app to verify your email.
    </p>

    <p style="margin:0 0 8px 0;">Hi ${esc(name)},</p>
    <p style="margin:0 0 16px 0;">
      Use the code below to finish setting up your account. It expires in <strong>15 minutes</strong>.
    </p>

    <p style="margin:0 0 8px 0;font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND_PRIMARY};text-align:center;font-family:ui-monospace,monospace;">
      ${esc(code)}
    </p>

    <p style="margin:16px 0 0 0;font-size:15px;color:${INK_MUTED};">
      If you didn&#8217;t create an account, you can ignore this email.
    </p>
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Password Reset                                              */
/* ------------------------------------------------------------------ */

/** Plain-text mirror of {@link passwordResetEmail}. */
export function passwordResetEmailText(resetUrl: string): string {
  return [
    "Hi,",
    "",
    "We received a request to reset your Salebiz password. Use the link below to choose a new one:",
    "",
    resetUrl,
    "",
    "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
    "",
    "— The Salebiz team",
  ].join("\n");
}

export function passwordResetEmail(resetUrl: string): string {
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      Reset your password
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      We received a request to reset your password.
    </p>

    <p style="margin:0 0 4px 0;">
      Click the button below to choose a new password. If you didn&#8217;t request this, you can safely ignore this email&mdash;your password will remain unchanged.
    </p>

    ${ctaButton(resetUrl, "Reset my password")}

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background-color:#fef9ef;border-left:4px solid #e6a817;border-radius:4px;">
      <tr>
        <td style="padding:12px 16px;font-size:15px;color:#7a5d00;">
          <strong>Security tip:</strong> This link expires in <strong>1 hour</strong>. Never share this link with anyone. Salebiz will never ask you for your password.
        </td>
      </tr>
    </table>

    ${fallbackUrl(resetUrl)}
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Admin — New Broker Pending Approval                         */
/* ------------------------------------------------------------------ */

export function adminBrokerSignupEmail(brokerEmail: string, adminDashboardUrl: string): string {
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      New broker signup
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      A new broker has verified their email and is waiting for your approval.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:${SURFACE_INSET};border-radius:8px;border:1px solid ${BORDER_SOFT};">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 2px 0;font-size:14px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;">Broker Email</p>
          <p style="margin:0;font-size:17px;color:${BRAND_PRIMARY};font-weight:600;">${esc(brokerEmail)}</p>
        </td>
      </tr>
    </table>

    ${ctaButton(adminDashboardUrl, "Review in dashboard")}

    <p style="margin:0;font-size:15px;color:${INK_MUTED};text-align:center;">
      You can approve or reject this broker from the Admin &rarr; Brokers panel.
    </p>
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Account Created by Admin (Set Password)                     */
/* ------------------------------------------------------------------ */

export function accountCreatedByAdminEmail(opts: {
  name: string | null;
  setPasswordUrl: string;
  agencyName: string | null;
  /** Who created the account — "Salebiz admin" or the agency owner's name. */
  createdByLabel: string;
  /** Whether the recipient is the new owner of a freshly-created agency (vs a member joining one). */
  isAgencyOwner: boolean;
  expiresInDays: number;
}): string {
  const { name, setPasswordUrl, agencyName, createdByLabel, isAgencyOwner, expiresInDays } = opts;
  const safeName = esc(name);
  const safeAgency = esc(agencyName);
  const safeCreatedBy = esc(createdByLabel);
  const greeting = safeName ? `Hi ${safeName},` : "Hi,";

  const intro = isAgencyOwner
    ? safeAgency
      ? `An account for <strong>${safeAgency}</strong> has been created for you on Salebiz by ${safeCreatedBy}.`
      : `An account has been created for you on Salebiz by ${safeCreatedBy}.`
    : safeAgency
      ? `You&#8217;ve been added as a broker for <strong>${safeAgency}</strong> on Salebiz by ${safeCreatedBy}.`
      : `An account has been created for you on Salebiz by ${safeCreatedBy}.`;

  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      Welcome to Salebiz
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      Your account is ready &mdash; just set a password to sign in.
    </p>

    <p style="margin:0 0 12px 0;">${greeting}</p>
    <p style="margin:0 0 12px 0;">${intro}</p>
    <p style="margin:0 0 4px 0;">
      Click the button below to choose your password. You can then sign in with your email address and start using Salebiz right away.
    </p>

    ${ctaButton(setPasswordUrl, "Set my password")}

    <p style="margin:0 0 4px 0;font-size:15px;color:${INK_MUTED};">
      This link will expire in <strong>${expiresInDays} days</strong>. If you weren&#8217;t expecting this, you can safely ignore this email.
    </p>

    ${fallbackUrl(setPasswordUrl)}
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Enquiry Notification (to Broker)                            */
/* ------------------------------------------------------------------ */

export function enquiryNotificationEmail(opts: {
  listingTitle: string;
  reasonLabel: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  message: string;
  listingUrl: string;
  dashboardUrl: string;
}): string {
  const { listingTitle, reasonLabel, contactName, contactEmail, contactPhone, message, listingUrl, dashboardUrl } = opts;

  // Every field here is supplied by whoever submitted the enquiry form, so it
  // is untrusted and must be escaped before it reaches the broker's inbox.
  const safeTitle = esc(listingTitle);
  const safeEmail = esc(contactEmail);
  const safePhone = esc(contactPhone);

  return baseLayout(
    `
    ${heading("New enquiry received", `Someone is interested in ${safeTitle}.`)}

    ${infoPanel(`
      ${infoRow("Reason", esc(reasonLabel))}
      ${infoRow("From", esc(contactName) || safeEmail)}
      ${infoRow("Email", `<a href="mailto:${safeEmail}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${safeEmail}</a>`)}
      ${contactPhone ? infoRow("Phone", `<a href="tel:${safePhone}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${safePhone}</a>`) : ""}
    `)}

    ${quoteBlock("Their message", esc(message))}

    ${ctaButton(dashboardUrl, "Reply in dashboard")}

    ${fineprint(`Or ${secondaryLink(listingUrl, "view the listing")} this enquiry is about.`)}
  `,
    `${esc(contactName) || safeEmail} enquired about ${safeTitle}.`,
  );
}

/* ------------------------------------------------------------------ */
/*  Broker public profile contact                                      */
/* ------------------------------------------------------------------ */

export function brokerProfileContactEmail(opts: {
  brokerName: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  message: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const {
    brokerName,
    contactName,
    contactEmail,
    contactPhone,
    message,
    profileUrl,
    dashboardUrl,
  } = opts;

  // Contact fields come from a public form — untrusted, so escape all of them.
  const safeEmail = esc(contactEmail);
  const safePhone = esc(contactPhone);

  return baseLayout(
    `
    ${heading("New profile contact", "Someone contacted you from your public broker profile.")}

    ${infoPanel(`
      ${infoRow("To", esc(brokerName))}
      ${infoRow("From", esc(contactName) || safeEmail)}
      ${infoRow("Email", `<a href="mailto:${safeEmail}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${safeEmail}</a>`)}
      ${contactPhone ? infoRow("Phone", `<a href="tel:${safePhone}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${safePhone}</a>`) : ""}
    `)}

    ${quoteBlock("Their message", esc(message))}

    ${ctaButton(dashboardUrl, "View contact")}

    ${fineprint(`Or ${secondaryLink(profileUrl, "view your public profile")}.`)}
  `,
    `${esc(contactName) || safeEmail} contacted you via your Salebiz profile.`,
  );
}

export function brokerProfileContactConfirmationEmail(opts: {
  contactName: string | null;
  brokerName: string;
  profileUrl: string;
}): string {
  const { contactName, brokerName, profileUrl } = opts;
  // Contact-supplied; escape before it reaches anyone.
  const safeContact = esc(contactName);
  const safeBroker = esc(brokerName);
  const greeting = safeContact ? `Hi ${safeContact},` : "Hi,";

  return baseLayout(
    `
    ${heading("Your message has been sent")}

    ${paragraph(greeting)}
    ${paragraph(`Thanks for contacting <strong>${safeBroker}</strong>. They&#8217;ve received your message and will be in touch shortly.`)}

    ${ctaButton(profileUrl, "View broker profile")}

    ${fineprint("If you didn&#8217;t send this message, you can safely ignore this email.")}
  `,
    `${safeBroker} has received your message and will be in touch.`,
  );
}

/* ------------------------------------------------------------------ */
/*  Email: Broker Invitation (to invited broker)                       */
/* ------------------------------------------------------------------ */

export function brokerInvitationEmail(opts: {
  agencyName: string;
  inviterName: string | null;
  joinUrl: string;
  expiresInDays: number;
}): string {
  const { agencyName, inviterName, joinUrl, expiresInDays } = opts;
  const safeAgency = esc(agencyName);
  const safeInviter = esc(inviterName);
  const invitedBy = safeInviter ? `<strong>${safeInviter}</strong> has` : "You have been";

  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      You&#8217;re Invited!
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      Join <strong>${safeAgency}</strong> on Salebiz.com.au
    </p>

    <p style="margin:0 0 8px 0;">
      ${invitedBy} invited you to join <strong>${safeAgency}</strong> as a broker on Salebiz.
    </p>
    <p style="margin:0 0 4px 0;">
      Click the button below to create your account and start managing listings.
    </p>

    ${ctaButton(joinUrl, "Accept invitation")}

    <p style="margin:0 0 4px 0;font-size:15px;color:${INK_MUTED};">
      This invitation will expire in <strong>${expiresInDays} days</strong>. If you weren&#8217;t expecting this, you can safely ignore this email.
    </p>

    ${fallbackUrl(joinUrl)}
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Invoice Requested (to admin)                                 */
/* ------------------------------------------------------------------ */

export function invoiceRequestedAdminEmail({
  agencyName,
  listingTitle,
  productName,
  amount,
  breakdown,
  notes,
  adminUrl,
}: {
  agencyName: string;
  listingTitle: string;
  productName: string;
  amount: string;
  /** Optional per-seat breakdown for tiered subscription invoices. */
  breakdown?: string | null;
  notes: string | null;
  adminUrl: string;
}): string {
  const safeAgency = esc(agencyName);
  const safeAmount = esc(amount);

  return baseLayout(
    `
    ${heading("New invoice request", "An agency has asked for an invoice instead of paying by card.")}

    ${infoPanel(`
      ${infoRow("Agency", `<strong>${safeAgency}</strong>`)}
      ${infoRow("Listing", esc(listingTitle))}
      ${infoRow("Product", esc(productName))}
      ${infoRow("Amount", `<strong>${safeAmount}</strong>`)}
      ${breakdown ? infoRow("Breakdown", esc(breakdown)) : ""}
    `)}

    ${notes ? quoteBlock("Agency notes", esc(notes)) : ""}

    ${ctaButton(adminUrl, "View in admin dashboard")}

    ${fineprint("Generate the invoice in your accounting software and send it to the agency. Once payment arrives, mark it as paid in the dashboard.")}
  `,
    `${safeAgency} requested an invoice for ${safeAmount}.`,
  );
}

/* ------------------------------------------------------------------ */
/*  Email: Invoice Status Update (to agency)                            */
/* ------------------------------------------------------------------ */

export function invoiceStatusEmail({
  agencyName,
  listingTitle,
  status,
  amount,
}: {
  agencyName: string;
  listingTitle: string;
  status: "approved" | "paid";
  amount: string;
}): string {
  const isPaid = status === "paid";
  const safeAgency = esc(agencyName);
  const safeTitle = esc(listingTitle);
  const safeAmount = esc(amount);

  return baseLayout(
    `
    ${heading(
      isPaid ? "Payment confirmed" : "Invoice approved",
      `Hi ${safeAgency},`,
    )}

    ${paragraph(
      isPaid
        ? `Your payment of <strong>${safeAmount}</strong> for <strong>${safeTitle}</strong> has been confirmed. Your listing is now live on Salebiz.`
        : `Your invoice request for <strong>${safeTitle}</strong> (${safeAmount}) has been approved. Please complete payment using the details on the invoice we sent you.`,
    )}

    ${ctaButton(process.env.NEXTAUTH_URL ?? "https://salebiz.com.au", "Go to dashboard")}

    ${fineprint(
      isPaid
        ? "Thanks for your payment — your listing is now visible to buyers."
        : "Once payment reaches us, your listing is published automatically.",
    )}
  `,
    isPaid
      ? `Your payment of ${safeAmount} is confirmed and ${safeTitle} is live.`
      : `Your invoice for ${safeTitle} has been approved.`,
  );
}

/* ------------------------------------------------------------------ */
/*  Share listing with contact                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Enquiry confirmation (to the buyer who submitted)                  */
/* ------------------------------------------------------------------ */

export function enquiryConfirmationEmail({
  contactName,
  listingTitle,
  listingUrl,
  brokerName,
}: {
  contactName: string | null;
  listingTitle: string;
  listingUrl: string;
  brokerName: string | null;
}): string {
  const greeting = esc(contactName) ? `Hi ${esc(contactName)},` : "Hi,";
  const brokerLine = brokerName ? ` The broker (<strong>${esc(brokerName)}</strong>) has been notified and` : " The listing broker has been notified and";

  const safeTitle = esc(listingTitle);

  return baseLayout(
    `
    ${heading("Your enquiry has been sent")}

    ${paragraph(greeting)}
    ${paragraph(`Thanks for your enquiry on <strong>${safeTitle}</strong>.${brokerLine} will be in touch with you shortly.`)}

    ${ctaButton(listingUrl, "View the listing")}

    ${fineprint("If you didn&#8217;t send this enquiry, you can safely ignore this email.")}
  `,
    `We've passed your enquiry about ${safeTitle} to the broker.`,
  );
}

export function externalShareInviteEmail({
  recipientName,
  brokerName,
  brokerCompany,
  brokerPhotoUrl,
  brokerProfileUrl,
  listingTitle,
  inviteUrl,
  price,
  location,
  customMessage,
  ndaRequired,
  expiresInDays,
  signatureHtml,
}: {
  recipientName: string | null;
  brokerName: string;
  brokerCompany: string | null;
  brokerPhotoUrl: string | null;
  brokerProfileUrl: string | null;
  listingTitle: string;
  inviteUrl: string;
  price: string | null;
  location: string | null;
  customMessage: string | null;
  ndaRequired: boolean;
  expiresInDays: number;
  /** Optional broker signature HTML appended before the expiry footer. */
  signatureHtml?: string | null;
}): string {
  const safeRecipient = esc(recipientName);
  const safeBrokerName = esc(brokerName);
  const safeBrokerCompany = esc(brokerCompany);
  const safeListingTitle = esc(listingTitle);
  const safeDetails = esc([price, location].filter(Boolean).join(" · "));
  const greeting = safeRecipient ? `Hi ${safeRecipient},` : "Hi,";
  const senderLabel = safeBrokerCompany
    ? `<strong>${safeBrokerName}</strong> from ${safeBrokerCompany}`
    : `<strong>${safeBrokerName}</strong>`;

  const messageBlock = customMessage?.trim()
    ? `<div style="margin:0 0 20px;padding:16px 20px;background:#fff8ec;border-radius:8px;border-left:4px solid #d97706;">
        <p style="margin:0 0 6px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:16px;color:${INK_BODY};line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  const brokerCard = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background:#f6faf7;border-radius:8px;border:1px solid ${BORDER_SOFT};">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${brokerPhotoUrl
                ? `<td style="padding-right:14px;vertical-align:middle;">
                    <img src="${esc(brokerPhotoUrl)}" alt="${safeBrokerName}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid ${BORDER_SOFT};" />
                  </td>`
                : ""}
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:16px;font-weight:600;color:${INK_TITLE};">${safeBrokerName}</p>
                ${safeBrokerCompany ? `<p style="margin:2px 0 0;font-size:14px;color:${INK_MUTED};">${safeBrokerCompany}</p>` : ""}
                ${brokerProfileUrl ? `<p style="margin:6px 0 0;font-size:14px;"><a href="${esc(brokerProfileUrl)}" style="color:${BRAND_PRIMARY};text-decoration:underline;">View broker profile</a></p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const ndaNotice = ndaRequired
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background-color:#fef9ef;border-left:4px solid #e6a817;border-radius:4px;">
        <tr>
          <td style="padding:12px 16px;font-size:15px;color:#7a5d00;">
            <strong>Confidentiality required.</strong> You will be asked to sign a short non-disclosure agreement before viewing the full details.
          </td>
        </tr>
      </table>`
    : "";

  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      A business listing has been shared with you
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      ${senderLabel} has shared this opportunity with you on Salebiz.com.au.
    </p>

    ${brokerCard}

    ${messageBlock}

    <div style="margin:0 0 20px;padding:20px;background-color:${SURFACE_INSET};border-radius:12px;border:1px solid ${BORDER_SOFT};">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:${INK_TITLE};">
        ${safeListingTitle}
      </p>
      ${safeDetails ? `<p style="margin:0;font-size:16px;color:${INK_MUTED};">${safeDetails}</p>` : ""}
    </div>

    ${ndaNotice}

    ${ctaButton(inviteUrl, "View listing")}

    ${signatureHtml ?? ""}

    <p style="margin:8px 0 4px 0;font-size:15px;color:${INK_MUTED};text-align:center;">
      This link will create a free buyer account and lasts for ${expiresInDays} days.
    </p>

    ${fallbackUrl(inviteUrl)}
  `);
}

export function shareMultipleListingsEmail({
  contactName,
  brokerName,
  brokerCompany,
  listings,
  customMessage,
  unsubscribeUrl,
  signatureHtml,
}: {
  contactName: string | null;
  brokerName: string;
  brokerCompany?: string | null;
  listings: { title: string; url: string; price: string | null; location: string | null }[];
  customMessage?: string | null;
  unsubscribeUrl?: string | null;
  /** Optional broker signature HTML appended before the unsubscribe footer. */
  signatureHtml?: string | null;
}): string {
  const safeContact = esc(contactName);
  const safeBrokerName = esc(brokerName);
  const safeBrokerCompany = esc(brokerCompany);
  const greeting = safeContact ? `Hi ${safeContact},` : "Hi,";
  const senderLabel = safeBrokerCompany
    ? `<strong>${safeBrokerName}</strong> from ${safeBrokerCompany}`
    : `<strong>${safeBrokerName}</strong>`;

  const messageBlock = customMessage?.trim()
    ? `<div style="margin:0 0 20px;padding:16px 20px;background:#fff8ec;border-radius:8px;border-left:4px solid #d97706;">
        <p style="margin:0 0 6px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:16px;color:${INK_BODY};line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  const listingCards = listings
    .map((l) => {
      const safeTitle = esc(l.title);
      const safeDetails = esc([l.price, l.location].filter(Boolean).join(" · "));
      const safeUrl = esc(l.url);
      return `
    <div style="margin:0 0 16px;padding:20px;background-color:${SURFACE_INSET};border-radius:12px;border:1px solid ${BORDER_SOFT};">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:${INK_TITLE};">${safeTitle}</p>
      ${safeDetails ? `<p style="margin:0 0 12px;font-size:16px;color:${INK_MUTED};">${safeDetails}</p>` : ""}
      <a href="${safeUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:10px 24px;border-radius:8px;">
        View Listing
      </a>
    </div>`;
    })
    .join("");

  const listingCountLabel =
    listings.length === 1
      ? "a business listing"
      : `${listings.length} business listings`;

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">${greeting}</p>

    <p style="margin:0 0 20px;font-size:17px;line-height:1.5;">
      ${senderLabel} thought you might be interested in ${listingCountLabel}:
    </p>

    ${messageBlock}

    ${listingCards}

    ${signatureHtml ?? ""}

    <p style="margin:0 0 8px;font-size:15px;color:${INK_MUTED};">
      This email was sent by a broker on Salebiz.com.au. If you did not expect this, you can safely ignore it.
    </p>
    ${
      unsubscribeUrl
        ? `<p style="margin:0;font-size:14px;color:${INK_FAINT};">
        <a href="${esc(unsubscribeUrl)}" style="color:${INK_FAINT};text-decoration:underline;">Unsubscribe from listing emails</a>
      </p>`
        : ""
    }
  `);
}

export function shareListingEmail({
  contactName,
  brokerName,
  brokerCompany,
  listingTitle,
  listingUrl,
  price,
  location,
  customMessage,
  unsubscribeUrl,
  signatureHtml,
}: {
  contactName: string | null;
  brokerName: string;
  brokerCompany?: string | null;
  listingTitle: string;
  listingUrl: string;
  price: string | null;
  location: string | null;
  customMessage?: string | null;
  unsubscribeUrl?: string | null;
  /** Optional broker signature HTML appended before the unsubscribe footer. */
  signatureHtml?: string | null;
}): string {
  const safeContact = esc(contactName);
  const safeBrokerName = esc(brokerName);
  const safeBrokerCompany = esc(brokerCompany);
  const safeListingTitle = esc(listingTitle);
  const safeListingUrl = esc(listingUrl);
  const safeDetails = esc([price, location].filter(Boolean).join(" · "));
  const greeting = safeContact ? `Hi ${safeContact},` : "Hi,";
  const senderLabel = safeBrokerCompany
    ? `<strong>${safeBrokerName}</strong> from ${safeBrokerCompany}`
    : `<strong>${safeBrokerName}</strong>`;

  const messageBlock = customMessage?.trim()
    ? `<div style="margin:0 0 20px;padding:16px 20px;background:#fff8ec;border-radius:8px;border-left:4px solid #d97706;">
        <p style="margin:0 0 6px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:16px;color:${INK_BODY};line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      ${senderLabel} thought you might be interested in this business listing:
    </p>

    ${messageBlock}

    <div style="margin:0 0 24px;padding:20px;background-color:${SURFACE_INSET};border-radius:12px;border:1px solid ${BORDER_SOFT};">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:${INK_TITLE};">
        ${safeListingTitle}
      </p>
      ${safeDetails ? `<p style="margin:0 0 12px;font-size:16px;color:${INK_MUTED};">${safeDetails}</p>` : ""}
      <a href="${safeListingUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:10px 24px;border-radius:8px;">
        View Listing
      </a>
    </div>

    ${signatureHtml ?? ""}

    <p style="margin:0 0 8px;font-size:15px;color:${INK_MUTED};">
      This email was sent by a broker on Salebiz.com.au. If you did not expect this, you can safely ignore it.
    </p>
    ${unsubscribeUrl
      ? `<p style="margin:0;font-size:14px;color:${INK_FAINT};">
        <a href="${esc(unsubscribeUrl)}" style="color:${INK_FAINT};text-decoration:underline;">Unsubscribe from listing emails</a>
      </p>`
      : ""}
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Invite a buyer to create a Salebiz account                 */
/* ------------------------------------------------------------------ */

export function buyerInviteEmail({
  contactName,
  brokerName,
  brokerCompany,
  registerUrl,
  customMessage,
  signatureHtml,
}: {
  contactName: string | null;
  brokerName: string;
  brokerCompany?: string | null;
  registerUrl: string;
  customMessage?: string | null;
  /** Optional broker signature HTML appended before the footer. */
  signatureHtml?: string | null;
}): string {
  const safeContact = esc(contactName);
  const safeBrokerName = esc(brokerName);
  const safeBrokerCompany = esc(brokerCompany);
  const safeRegisterUrl = esc(registerUrl);
  const greeting = safeContact ? `Hi ${safeContact},` : "Hi,";
  const senderLabel = safeBrokerCompany
    ? `<strong>${safeBrokerName}</strong> from ${safeBrokerCompany}`
    : `<strong>${safeBrokerName}</strong>`;

  const messageBlock = customMessage?.trim()
    ? `<div style="margin:0 0 20px;padding:16px 20px;background:#fff8ec;border-radius:8px;border-left:4px solid #d97706;">
        <p style="margin:0 0 6px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:16px;color:${INK_BODY};line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      ${senderLabel} has invited you to join Salebiz, the marketplace for buying
      and selling businesses in Australia. Creating a free account lets you save
      listings, request information packs, and keep in touch about opportunities
      that match what you are looking for.
    </p>

    ${messageBlock}

    <div style="margin:0 0 24px;">
      <a href="${safeRegisterUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 28px;border-radius:8px;">
        Create your free account
      </a>
    </div>

    ${signatureHtml ?? ""}

    <p style="margin:0 0 8px;font-size:15px;color:${INK_MUTED};">
      This invitation was sent by a broker on Salebiz.com.au. If you did not expect this, you can safely ignore it.
    </p>
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Buyer alert match (Feature 3)                              */
/* ------------------------------------------------------------------ */

export function buyerAlertMatchEmail(opts: {
  buyerName: string | null;
  alertLabel: string | null;
  listingTitle: string;
  listingUrl: string;
  price: string | null;
  location: string | null;
  /** Short, plain-English summary of why this matched (e.g. "café in Sydney under $500k"). */
  matchedFor: string | null;
  manageAlertsUrl: string;
}): string {
  const greeting = opts.buyerName ? `Hi ${esc(opts.buyerName.split(/\s+/)[0])},` : "Hi,";
  const details = [opts.price, opts.location].filter(Boolean).map((v) => esc(String(v))).join(" &middot; ");
  const safeTitle = esc(opts.listingTitle);
  const matchedForBlock = opts.matchedFor
    ? `<p style="margin:0 0 6px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.7px;font-weight:700;">Matched your alert</p>
       <p style="margin:0 0 24px;font-size:16px;color:${INK_BODY};line-height:1.6;">
         ${esc(opts.matchedFor)}${opts.alertLabel ? ` &mdash; <em>${esc(opts.alertLabel)}</em>` : ""}
       </p>`
    : "";

  return baseLayout(
    `
    ${heading("A new match for your alert")}

    ${paragraph(greeting)}
    ${paragraph("A new business matching one of your saved alerts has just been listed on Salebiz.")}

    ${matchedForBlock}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 26px 0;background-color:${SURFACE_INSET};border:1px solid ${BORDER_SOFT};border-radius:12px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:${INK_TITLE};line-height:1.3;">${safeTitle}</p>
          ${details ? `<p style="margin:0;font-size:16px;color:${INK_MUTED};">${details}</p>` : ""}
          ${ctaButton(opts.listingUrl, "View listing")}
        </td>
      </tr>
    </table>

    ${fineprint(`You&#8217;re getting this because the listing matches an alert saved in your Salebiz account. ${secondaryLink(opts.manageAlertsUrl, "Manage your alerts")}.`)}
  `,
    `${safeTitle}${details ? ` — ${details}` : ""}`,
  );
}

/* ------------------------------------------------------------------ */
/*  Support tickets (Feature #8)                                       */
/* ------------------------------------------------------------------ */

/** Sent ONCE to the broker who submitted a ticket, confirming receipt. */
export function supportTicketConfirmationEmail(opts: {
  brokerName: string | null;
  ticketNo: number;
  subject: string;
  ticketUrl: string;
}): string {
  const greeting = opts.brokerName
    ? `Hi ${esc(opts.brokerName.split(/\s+/)[0])},`
    : "Hi,";
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      We&apos;ve received your request
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      Ticket #${opts.ticketNo} has been logged with our support team.
    </p>

    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      Thanks for reaching out. Your support ticket has been created and our team
      will get back to you as soon as possible. You can track its progress and
      reply from your dashboard.
    </p>

    <div style="margin:0 0 8px;padding:16px 20px;background-color:${SURFACE_INSET};border-radius:12px;border:1px solid ${BORDER_SOFT};">
      <p style="margin:0 0 2px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Subject</p>
      <p style="margin:0;font-size:16px;color:${INK_TITLE};font-weight:600;">${esc(opts.subject)}</p>
    </div>

    ${ctaButton(opts.ticketUrl, "View ticket")}
  `);
}

/** Sent to admins when a broker submits a new ticket. */
export function supportTicketAdminNotificationEmail(opts: {
  ticketNo: number;
  subject: string;
  brokerName: string | null;
  brokerEmail: string | null;
  categoryLabel: string;
  priorityLabel: string;
  messageExcerpt: string;
  ticketUrl: string;
}): string {
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      New support ticket
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      Ticket #${opts.ticketNo} was submitted by a broker.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:${SURFACE_INSET};border:1px solid ${BORDER_SOFT};border-radius:8px;">
      ${infoRow("Subject", esc(opts.subject))}
      ${infoRow("From", esc(opts.brokerName ?? opts.brokerEmail ?? "Broker"))}
      ${opts.brokerEmail ? infoRow("Email", esc(opts.brokerEmail)) : ""}
      ${infoRow("Category", esc(opts.categoryLabel))}
      ${infoRow("Priority", esc(opts.priorityLabel))}
    </table>

    <p style="margin:0 0 6px;font-size:13px;color:${INK_MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Message</p>
    <p style="margin:0 0 8px;font-size:16px;color:${INK_BODY};line-height:1.6;white-space:pre-line;">${esc(opts.messageExcerpt)}</p>

    ${ctaButton(opts.ticketUrl, "Open in admin")}
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Managed onboarding requests                                 */
/* ------------------------------------------------------------------ */

/** Sent to the broker who asked us to handle their onboarding. */
export function onboardingRequestConfirmationEmail(opts: {
  name: string;
  requestNo: number;
}): string {
  const greeting = `Hi ${esc(opts.name.split(/\s+/)[0])},`;
  return baseLayout(`
    <h1 class="sb-title" style="margin:0 0 10px 0;color:${INK_TITLE};font-size:29px;line-height:1.2;font-weight:700;letter-spacing:-0.4px;">
      We&apos;ll take it from here
    </h1>
    <p style="margin:0 0 26px 0;color:${INK_MUTED};font-size:17px;line-height:1.6;">
      Request #${opts.requestNo} has been logged with our onboarding team.
    </p>

    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">${greeting}</p>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      Thanks for asking us to set up your agency on Salebiz. One of our team
      will contact you within one business day to arrange a time, collect your
      listing details, and do the setup for you.
    </p>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.5;">
      You don&apos;t need to do anything else for now. If anything changes in the
      meantime, just reply to this thread and let us know.
    </p>
  `);
}

/** Plain-text mirror of {@link onboardingRequestConfirmationEmail}. */
export function onboardingRequestConfirmationEmailText(opts: {
  name: string;
  requestNo: number;
}): string {
  return [
    `Hi ${opts.name.split(/\s+/)[0]},`,
    "",
    `Thanks for asking us to set up your agency on Salebiz. Your request (#${opts.requestNo}) has been logged with our onboarding team.`,
    "",
    "One of our team will contact you within one business day to arrange a time, collect your listing details, and do the setup for you.",
    "",
    "You don't need to do anything else for now.",
    "",
    "— The Salebiz team",
  ].join("\n");
}

/** Sent to admins when a broker requests managed onboarding. */
export function onboardingRequestAdminNotificationEmail(opts: {
  requestNo: number;
  name: string;
  email: string;
  phone: string | null;
  agencyName: string | null;
  listingCountLabel: string | null;
  message: string | null;
  adminUrl: string;
}): string {
  const safeName = esc(opts.name);
  const safeEmail = esc(opts.email);

  return baseLayout(
    `
    ${heading(
      "New onboarding request",
      `Request #${opts.requestNo} &mdash; a broker wants us to set them up.`,
    )}

    ${infoPanel(`
      ${infoRow("Name", `<strong>${safeName}</strong>`)}
      ${infoRow("Email", `<a href="mailto:${safeEmail}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${safeEmail}</a>`)}
      ${opts.phone ? infoRow("Phone", `<a href="tel:${esc(opts.phone)}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${esc(opts.phone)}</a>`) : ""}
      ${opts.agencyName ? infoRow("Agency", esc(opts.agencyName)) : ""}
      ${opts.listingCountLabel ? infoRow("Listings", esc(opts.listingCountLabel)) : ""}
    `)}

    ${opts.message ? quoteBlock("Their message", esc(opts.message)) : ""}

    ${ctaButton(opts.adminUrl, "Open in admin")}
  `,
    `${safeName}${opts.agencyName ? ` (${esc(opts.agencyName)})` : ""} wants managed onboarding.`,
  );
}
