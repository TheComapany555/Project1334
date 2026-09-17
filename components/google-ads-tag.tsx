import Script from "next/script";

/**
 * Google Ads tag (AW-…), used for conversion tracking and remarketing audiences.
 *
 * This is SEPARATE from the GA4 measurement tag (G-…) mounted via
 * `<GoogleAnalytics>` in app/layout.tsx. Both are gtag.js tags and are designed
 * to coexist: gtag.js is loaded once, then each tag is registered with its own
 * `config` call. We only inject the loader here when GA4 is absent, so the two
 * never race to load the same script.
 *
 * Driven by NEXT_PUBLIC_GOOGLE_ADS_ID so the tag can be changed or removed
 * without a code change. NEXT_PUBLIC_* values are inlined at BUILD time, so a
 * change to it requires a redeploy, not just an env update.
 */
export function GoogleAdsTag({
  adsId,
  /** True when <GoogleAnalytics> already loads gtag.js on the page. */
  gtagAlreadyLoaded,
}: {
  adsId: string;
  gtagAlreadyLoaded: boolean;
}) {
  return (
    <>
      {!gtagAlreadyLoaded && (
        <Script
          id="gtag-loader"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        />
      )}
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
