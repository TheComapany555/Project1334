/**
 * Google Ads / GA4 conversion events.
 *
 * Registration on Salebiz never navigates — the form swaps to an inline success
 * state, so the URL does not change. A URL-based Ads conversion therefore
 * cannot work here, and pointing one at the registration page counts *visits*,
 * not sign-ups. These helpers fire an explicit event at the moment the server
 * action actually confirms the account was created.
 *
 * Client-only: `gtag` exists in the browser. Every function no-ops safely when
 * the tag is absent (ad blocker, local dev without an ID configured), so a
 * caller never needs to guard.
 */

type GtagFn = (
  command: "event" | "config" | "js" | "set",
  ...args: unknown[]
) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    // Must match the declaration shipped by @next/third-parties, which also
    // augments Window with `Object[]`; any other element type is a
    // redeclaration error. Hence the upper-cased type the lint rule dislikes.
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    dataLayer?: Object[];
  }
}

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/**
 * Conversion label for the Ads "Sign Up" action, in Google's
 * `AW-XXXXXXXXX/AbC-D_efGh` format.
 *
 * Optional: without it the event still reaches GA4 (and can be imported into
 * Ads as a GA4 conversion), it just is not attributed to a specific Ads
 * conversion action. Set it once Ads gives you the label.
 */
const SIGNUP_SEND_TO = process.env.NEXT_PUBLIC_ADS_SIGNUP_CONVERSION_LABEL;

function gtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  return typeof window.gtag === "function" ? window.gtag : null;
}

/**
 * Report a completed registration.
 *
 * Fires two events on purpose:
 *  - `sign_up` — the GA4 recommended event, with the account type attached so
 *    buyer and broker sign-ups can be segmented (or split into two Ads
 *    conversion actions) without a code change.
 *  - `conversion` — the Ads-specific event, only when a conversion label is
 *    configured. This is what Google Ads counts.
 *
 * Call it exactly once, after the server confirms success — never on form
 * submit, or failed attempts would be counted.
 */
export function trackSignUpConversion(accountType: "buyer" | "broker"): void {
  const send = gtag();
  if (!send) return;

  try {
    send("event", "sign_up", {
      method: "email",
      account_type: accountType,
      // Mirrored into an Ads custom variable if one is mapped to it.
      send_to: ADS_ID,
    });

    if (SIGNUP_SEND_TO) {
      send("event", "conversion", {
        send_to: SIGNUP_SEND_TO,
        event_category: "signup",
        account_type: accountType,
      });
    }
  } catch {
    // Analytics must never break a signup. Swallow and move on.
  }
}

/**
 * Report a verified email address — a higher-quality signal than form submit,
 * since it proves the address is real. Kept separate so Ads can track whichever
 * step the campaign is optimising for.
 */
export function trackEmailVerified(): void {
  const send = gtag();
  if (!send) return;
  try {
    send("event", "email_verified", { send_to: ADS_ID });
  } catch {
    // no-op
  }
}
