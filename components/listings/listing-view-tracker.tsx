"use client";

import { useEffect, useRef } from "react";

interface Props {
  listingId: string;
}

/**
 * Invisible component — fires on mount to record a web page view and
 * updates the duration when the user leaves the page.
 */
export function ListingViewTracker({ listingId }: Props) {
  const viewIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(0);
  const sentRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();

    // Record the view
    fetch("/api/track/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.view_id) viewIdRef.current = d.view_id;
      })
      .catch(() => {});

    const sendDuration = () => {
      if (sentRef.current || !viewIdRef.current) return;
      const seconds = (Date.now() - startRef.current) / 1000;
      if (seconds < 2) return;
      sentRef.current = true;

      const payload = JSON.stringify({
        view_id: viewIdRef.current,
        duration_seconds: seconds,
      });

      // sendBeacon is reliable even when the tab is closing
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/track/view/duration", blob);
      } else {
        fetch("/api/track/view/duration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };

    window.addEventListener("beforeunload", sendDuration);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", sendDuration);
      document.removeEventListener("visibilitychange", onVisibility);
      sendDuration(); // SPA navigation — component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  return null;
}
