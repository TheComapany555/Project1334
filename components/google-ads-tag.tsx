/**
 * Google tag (gtag.js) for GA4 + Google Ads.
 *
 * Rendered as PLAIN `<script>` elements in `<head>`, not via `next/script`.
 *
 * Why this matters: `next/script` with `afterInteractive` injects the tag from
 * client JavaScript, so the served HTML contains no `<script>` element at all —
 * the tag only exists inside React's streaming payload. Real browsers run it
 * fine, but Google's tag verification (and the Ads "tag not detected" check)
 * fetches the HTML without executing React, sees nothing, and reports the tag
 * as missing. That is what puts a campaign into "misconfigured / limited".
 *
 * Emitting real script tags server-side fixes verification without changing
 * what the tag does at runtime. `async` keeps it off the critical path.
 *
 * Both IDs are configured with a single gtag.js load, which is the documented
 * way to run GA4 and Ads together — never load the loader twice.
 *
 * NEXT_PUBLIC_* values are inlined at BUILD time, so changing an ID requires a
 * redeploy, not just an environment-variable update.
 */
export function GoogleTag({
  gaId,
  adsId,
}: {
  gaId?: string;
  adsId?: string;
}) {
  // The loader needs one id in its URL; either tag can provide it.
  const loaderId = gaId ?? adsId;
  if (!loaderId) return null;

  const configLines = [
    gaId ? `gtag('config','${gaId}');` : "",
    adsId ? `gtag('config','${adsId}');` : "",
  ]
    .filter(Boolean)
    .join("");

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
      />
      <script
        // Inline bootstrap: defines dataLayer/gtag before the loader arrives,
        // so events queued by the app are never dropped.
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${configLines}`,
        }}
      />
    </>
  );
}
