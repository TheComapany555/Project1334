/** Branded email templates for Salebiz.com.au — hex matches app primary/secondary */

import { SALEBIZ_LOGO_URL } from "@/lib/branding";

const BRAND_PRIMARY = "#0d5c2f";

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

function baseLayout(content: string): string {
  const logoUrl = SALEBIZ_LOGO_URL;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Salebiz</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f6f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Green accent bar -->
          <tr>
            <td style="background-color:${BRAND_PRIMARY};height:6px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:#ffffff;padding:28px 32px 20px 32px;text-align:center;">
              <img src="${logoUrl}" alt="Salebiz" width="150" style="display:block;margin:0 auto;max-width:150px;height:auto;border:0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px 32px;color:#333333;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="border-top:1px solid #e8ebe9;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;text-align:center;">
              <p style="margin:0 0 6px 0;color:#888888;font-size:12px;line-height:1.5;">
                &copy; ${year} Salebiz.com.au &mdash; Australia&#8217;s Business Marketplace
              </p>
              <p style="margin:0;color:#aaaaaa;font-size:11px;line-height:1.5;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td align="center" style="border-radius:8px;background-color:${BRAND_PRIMARY};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" fillcolor="${BRAND_PRIMARY}">
      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;background-color:${BRAND_PRIMARY};mso-hide:all;">${label}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function secondaryLink(href: string, label: string): string {
  return `<a href="${href}" target="_blank" style="color:${BRAND_PRIMARY};font-weight:500;text-decoration:underline;">${label}</a>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 12px;color:#666666;font-size:13px;font-weight:600;white-space:nowrap;vertical-align:top;">${label}</td>
  <td style="padding:6px 12px;color:#333333;font-size:14px;vertical-align:top;">${value}</td>
</tr>`;
}

/* ------------------------------------------------------------------ */
/*  Email: Verification                                                */
/* ------------------------------------------------------------------ */

export function verificationEmail(verifyUrl: string, name: string): string {
  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      Welcome to Salebiz!
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      You&#8217;re just one step away from getting started.
    </p>

    <p style="margin:0 0 8px 0;">Hi ${name},</p>
    <p style="margin:0 0 4px 0;">
      Thanks for signing up. Please confirm your email address to activate your account.
    </p>

    ${ctaButton(verifyUrl, "Verify My Email")}

    <p style="margin:0 0 4px 0;font-size:13px;color:#888888;">
      This link will expire in <strong>24 hours</strong>. If you didn&#8217;t create an account, you can safely ignore this email.
    </p>

    <p style="margin:16px 0 0 0;font-size:12px;color:#aaaaaa;word-break:break-all;">
      Or copy this link: ${verifyUrl}
    </p>
  `);
}

/** Mobile app — buyer account email verification (6-digit code, no link). */
export function mobileUserOtpEmail(code: string, name: string): string {
  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      Your verification code
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      Enter this code in the Salebiz app to verify your email.
    </p>

    <p style="margin:0 0 8px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Use the code below to finish setting up your account. It expires in <strong>15 minutes</strong>.
    </p>

    <p style="margin:0 0 8px 0;font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND_PRIMARY};text-align:center;font-family:ui-monospace,monospace;">
      ${code}
    </p>

    <p style="margin:16px 0 0 0;font-size:13px;color:#888888;">
      If you didn&#8217;t create an account, you can ignore this email.
    </p>
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Password Reset                                              */
/* ------------------------------------------------------------------ */

export function passwordResetEmail(resetUrl: string): string {
  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      Reset Your Password
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      We received a request to reset your password.
    </p>

    <p style="margin:0 0 4px 0;">
      Click the button below to choose a new password. If you didn&#8217;t request this, you can safely ignore this email&mdash;your password will remain unchanged.
    </p>

    ${ctaButton(resetUrl, "Reset Password")}

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background-color:#fef9ef;border-left:4px solid #e6a817;border-radius:4px;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#7a5d00;">
          <strong>Security tip:</strong> This link expires in <strong>1 hour</strong>. Never share this link with anyone. Salebiz will never ask you for your password.
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0 0;font-size:12px;color:#aaaaaa;word-break:break-all;">
      Or copy this link: ${resetUrl}
    </p>
  `);
}

/* ------------------------------------------------------------------ */
/*  Email: Admin — New Broker Pending Approval                         */
/* ------------------------------------------------------------------ */

export function adminBrokerSignupEmail(brokerEmail: string, adminDashboardUrl: string): string {
  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      New Broker Signup
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      A new broker has verified their email and is waiting for your approval.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:#f6faf7;border-radius:8px;border:1px solid #dce8df;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 2px 0;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Broker Email</p>
          <p style="margin:0;font-size:15px;color:${BRAND_PRIMARY};font-weight:600;">${brokerEmail}</p>
        </td>
      </tr>
    </table>

    ${ctaButton(adminDashboardUrl, "Review in Dashboard")}

    <p style="margin:0;font-size:13px;color:#888888;text-align:center;">
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
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      Welcome to Salebiz
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      Your account is ready &mdash; just set a password to sign in.
    </p>

    <p style="margin:0 0 12px 0;">${greeting}</p>
    <p style="margin:0 0 12px 0;">${intro}</p>
    <p style="margin:0 0 4px 0;">
      Click the button below to choose your password. You can then sign in with your email address and start using Salebiz right away.
    </p>

    ${ctaButton(setPasswordUrl, "Set My Password")}

    <p style="margin:0 0 4px 0;font-size:13px;color:#888888;">
      This link will expire in <strong>${expiresInDays} days</strong>. If you weren&#8217;t expecting this, you can safely ignore this email.
    </p>

    <p style="margin:16px 0 0 0;font-size:12px;color:#aaaaaa;word-break:break-all;">
      Or copy this link: ${setPasswordUrl}
    </p>
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

  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      New Enquiry Received
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      Someone is interested in your listing.
    </p>

    <!-- Listing badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:${BRAND_PRIMARY};border-radius:8px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0 0 2px 0;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.5px;">Listing</p>
          <p style="margin:0;font-size:16px;color:#ffffff;font-weight:600;">${listingTitle}</p>
        </td>
      </tr>
    </table>

    <!-- Contact details -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:#f6faf7;border-radius:8px;border:1px solid #dce8df;">
      ${infoRow("Reason", reasonLabel)}
      ${infoRow("From", contactName || contactEmail)}
      ${infoRow("Email", `<a href="mailto:${contactEmail}" style="color:${BRAND_PRIMARY};text-decoration:none;">${contactEmail}</a>`)}
      ${contactPhone ? infoRow("Phone", `<a href="tel:${contactPhone}" style="color:${BRAND_PRIMARY};text-decoration:none;">${contactPhone}</a>`) : ""}
    </table>

    <!-- Message -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="padding:16px 20px;background-color:#fafafa;border-radius:8px;border:1px solid #eeeeee;">
          <p style="margin:0 0 6px 0;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
          <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">${message.replace(/\n/g, "<br>")}</p>
        </td>
      </tr>
    </table>

    <!-- Actions -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 auto;">
      <tr>
        <td align="center" style="padding:0 8px;">
          ${ctaButton(dashboardUrl, "View in Dashboard")}
        </td>
      </tr>
      <tr>
        <td align="center">
          <p style="margin:0;font-size:13px;">${secondaryLink(listingUrl, "View Listing &rarr;")}</p>
        </td>
      </tr>
    </table>
  `);
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

  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      New Profile Contact
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      Someone contacted you from your public broker profile.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:${BRAND_PRIMARY};border-radius:8px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0 0 2px 0;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.5px;">Broker profile</p>
          <p style="margin:0;font-size:16px;color:#ffffff;font-weight:600;">${brokerName}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;background-color:#f6faf7;border-radius:8px;border:1px solid #dce8df;">
      ${infoRow("From", contactName || contactEmail)}
      ${infoRow("Email", `<a href="mailto:${contactEmail}" style="color:${BRAND_PRIMARY};text-decoration:none;">${contactEmail}</a>`)}
      ${contactPhone ? infoRow("Phone", `<a href="tel:${contactPhone}" style="color:${BRAND_PRIMARY};text-decoration:none;">${contactPhone}</a>`) : ""}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
      <tr>
        <td style="padding:16px 20px;background-color:#fafafa;border-radius:8px;border:1px solid #eeeeee;">
          <p style="margin:0 0 6px 0;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
          <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">${message.replace(/\n/g, "<br>")}</p>
        </td>
      </tr>
    </table>

    ${ctaButton(dashboardUrl, "View Contact")}

    <p style="margin:0;text-align:center;font-size:13px;">
      ${secondaryLink(profileUrl, "View public profile &rarr;")}
    </p>
  `);
}

export function brokerProfileContactConfirmationEmail(opts: {
  contactName: string | null;
  brokerName: string;
  profileUrl: string;
}): string {
  const { contactName, brokerName, profileUrl } = opts;
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Thanks for contacting <strong>${brokerName}</strong>. Your message has been received and they will be in touch shortly.
    </p>

    ${ctaButton(profileUrl, "View Broker Profile")}

    <p style="margin:0;font-size:13px;color:#888888;">
      If you didn't submit this message, please ignore this email.
    </p>
  `);
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
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      You&#8217;re Invited!
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      Join <strong>${safeAgency}</strong> on Salebiz.com.au
    </p>

    <p style="margin:0 0 8px 0;">
      ${invitedBy} invited you to join <strong>${safeAgency}</strong> as a broker on Salebiz.
    </p>
    <p style="margin:0 0 4px 0;">
      Click the button below to create your account and start managing listings.
    </p>

    ${ctaButton(joinUrl, "Accept Invitation")}

    <p style="margin:0 0 4px 0;font-size:13px;color:#888888;">
      This invitation will expire in <strong>${expiresInDays} days</strong>. If you weren&#8217;t expecting this, you can safely ignore this email.
    </p>

    <p style="margin:16px 0 0 0;font-size:12px;color:#aaaaaa;word-break:break-all;">
      Or copy this link: ${joinUrl}
    </p>
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
  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      New Invoice Request
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      An agency has requested an invoice instead of paying by card.
    </p>

    <table role="presentation" width="100%" style="border:1px solid #e5e5e5;border-radius:8px;margin:0 0 20px 0;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;">Agency</td><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;">${agencyName}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;">Listing</td><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;">${listingTitle}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;">Product</td><td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;">${productName}</td></tr>
      <tr><td style="padding:12px 16px;${breakdown ? "border-bottom:1px solid #f0f0f0;" : ""}font-size:13px;color:#888;">Amount</td><td style="padding:12px 16px;${breakdown ? "border-bottom:1px solid #f0f0f0;" : ""}font-size:14px;font-weight:600;">${amount}</td></tr>
      ${breakdown ? `<tr><td style="padding:12px 16px;font-size:13px;color:#888;">Breakdown</td><td style="padding:12px 16px;font-size:13px;color:#555;">${breakdown}</td></tr>` : ""}
    </table>

    ${notes ? `<p style="margin:0 0 20px 0;font-size:13px;color:#666;">
      <strong>Agency notes:</strong> ${notes}
    </p>` : ""}

    ${ctaButton(adminUrl, "View in Admin Dashboard")}

    <p style="margin:0;font-size:13px;color:#888888;">
      Generate the invoice in your accounting software and send it to the agency. Once payment is received, mark it as paid in the dashboard.
    </p>
  `);
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
  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      ${isPaid ? "Payment Confirmed" : "Invoice Approved"}
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      Hi ${agencyName},
    </p>

    <p style="margin:0 0 16px 0;">
      ${isPaid
        ? `Your payment of <strong>${amount}</strong> for <strong>${listingTitle}</strong> has been confirmed. Your listing is now live on the platform.`
        : `Your invoice request for <strong>${listingTitle}</strong> (${amount}) has been approved. Please complete the payment using the details on the invoice sent to you.`
      }
    </p>

    ${ctaButton(process.env.NEXTAUTH_URL ?? "https://salebiz.com.au", "Go to Dashboard")}

    <p style="margin:0;font-size:13px;color:#888888;">
      ${isPaid
        ? "Thank you for your payment. Your listing is now visible to buyers."
        : "Once payment is received, your listing will be published automatically."
      }
    </p>
  `);
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
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";
  const brokerLine = brokerName ? ` The broker (<strong>${brokerName}</strong>) has been notified and` : " The listing broker has been notified and";

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Thank you for your enquiry on <strong>${listingTitle}</strong>.${brokerLine} will be in touch with you shortly.
    </p>

    <div style="margin:0 0 24px;text-align:center;">
      <a href="${listingUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 32px;border-radius:8px;">
        View Listing
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#888888;">
      If you didn't submit this enquiry, please ignore this email.
    </p>
    <p style="margin:0;font-size:13px;color:#888888;">
      — The Salebiz Team
    </p>
  `);
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
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  const brokerCard = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background:#f6faf7;border-radius:8px;border:1px solid #dce8df;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${brokerPhotoUrl
                ? `<td style="padding-right:14px;vertical-align:middle;">
                    <img src="${esc(brokerPhotoUrl)}" alt="${safeBrokerName}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid #dce8df;" />
                  </td>`
                : ""}
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#0a0a0a;">${safeBrokerName}</p>
                ${safeBrokerCompany ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${safeBrokerCompany}</p>` : ""}
                ${brokerProfileUrl ? `<p style="margin:6px 0 0;font-size:12px;"><a href="${esc(brokerProfileUrl)}" style="color:${BRAND_PRIMARY};text-decoration:underline;">View broker profile</a></p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const ndaNotice = ndaRequired
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background-color:#fef9ef;border-left:4px solid #e6a817;border-radius:4px;">
        <tr>
          <td style="padding:12px 16px;font-size:13px;color:#7a5d00;">
            <strong>Confidentiality required.</strong> You will be asked to sign a short non-disclosure agreement before viewing the full details.
          </td>
        </tr>
      </table>`
    : "";

  return baseLayout(`
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};">
      A business listing has been shared with you
    </p>
    <p style="margin:0 0 20px 0;color:#666666;font-size:14px;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      ${senderLabel} has shared this opportunity with you on Salebiz.com.au.
    </p>

    ${brokerCard}

    ${messageBlock}

    <div style="margin:0 0 20px;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#0a0a0a;">
        ${safeListingTitle}
      </p>
      ${safeDetails ? `<p style="margin:0;font-size:14px;color:#6b7280;">${safeDetails}</p>` : ""}
    </div>

    ${ndaNotice}

    ${ctaButton(inviteUrl, "View Listing")}

    ${signatureHtml ?? ""}

    <p style="margin:8px 0 4px 0;font-size:13px;color:#888888;text-align:center;">
      This link will create a free buyer account and lasts for ${expiresInDays} days.
    </p>

    <p style="margin:16px 0 0 0;font-size:12px;color:#aaaaaa;word-break:break-all;">
      Or copy this link: ${inviteUrl}
    </p>
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
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  const listingCards = listings
    .map((l) => {
      const safeTitle = esc(l.title);
      const safeDetails = esc([l.price, l.location].filter(Boolean).join(" · "));
      const safeUrl = esc(l.url);
      return `
    <div style="margin:0 0 16px;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#0a0a0a;">${safeTitle}</p>
      ${safeDetails ? `<p style="margin:0 0 12px;font-size:14px;color:#6b7280;">${safeDetails}</p>` : ""}
      <a href="${safeUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;">
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
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${greeting}</p>

    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">
      ${senderLabel} thought you might be interested in ${listingCountLabel}:
    </p>

    ${messageBlock}

    ${listingCards}

    ${signatureHtml ?? ""}

    <p style="margin:0 0 8px;font-size:13px;color:#888888;">
      This email was sent by a broker on Salebiz.com.au. If you did not expect this, you can safely ignore it.
    </p>
    ${
      unsubscribeUrl
        ? `<p style="margin:0;font-size:12px;color:#aaaaaa;">
        <a href="${esc(unsubscribeUrl)}" style="color:#aaaaaa;text-decoration:underline;">Unsubscribe from listing emails</a>
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
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
          Message from ${safeBrokerName}
        </p>
        <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;white-space:pre-wrap;">${esc(customMessage.trim()).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      ${greeting}
    </p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      ${senderLabel} thought you might be interested in this business listing:
    </p>

    ${messageBlock}

    <div style="margin:0 0 24px;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#0a0a0a;">
        ${safeListingTitle}
      </p>
      ${safeDetails ? `<p style="margin:0 0 12px;font-size:14px;color:#6b7280;">${safeDetails}</p>` : ""}
      <a href="${safeListingUrl}" style="display:inline-block;background:${BRAND_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;">
        View Listing
      </a>
    </div>

    ${signatureHtml ?? ""}

    <p style="margin:0 0 8px;font-size:13px;color:#888888;">
      This email was sent by a broker on Salebiz.com.au. If you did not expect this, you can safely ignore it.
    </p>
    ${unsubscribeUrl
      ? `<p style="margin:0;font-size:12px;color:#aaaaaa;">
        <a href="${esc(unsubscribeUrl)}" style="color:#aaaaaa;text-decoration:underline;">Unsubscribe from listing emails</a>
      </p>`
      : ""}
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
  const greeting = opts.buyerName ? `Hi ${opts.buyerName.split(/\s+/)[0]},` : "Hi,";
  const details = [opts.price, opts.location].filter(Boolean).join(" &middot; ");
  const matchedForBlock = opts.matchedFor
    ? `<p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Matched your alert</p>
       <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">
         ${opts.matchedFor}${opts.alertLabel ? ` &mdash; <em>${opts.alertLabel}</em>` : ""}
       </p>`
    : "";

  return baseLayout(`
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${greeting}</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      A new business matching one of your alerts has just been listed on Salebiz.
    </p>

    ${matchedForBlock}

    <div style="margin:0 0 24px;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#0a0a0a;">${opts.listingTitle}</p>
      ${details ? `<p style="margin:0 0 14px;font-size:14px;color:#6b7280;">${details}</p>` : ""}
      ${ctaButton(opts.listingUrl, "View listing")}
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#888888;">
      You&apos;re receiving this because this listing matches one of the alerts saved in your Salebiz account.
      ${secondaryLink(opts.manageAlertsUrl, "Manage alerts")}.
    </p>
  `);
}
