"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

/** Configure NProgress once for a slim top bar (no spinner). */
function configureNProgress() {
  if (typeof window === "undefined") return;
  NProgress.configure({
    showSpinner: false,
    minimum: 0.08,
    speed: 200,
    trickle: true,
    trickleSpeed: 200,
  });
}

function isInternalLink(el: HTMLElement): boolean {
  const anchor = el.closest("a");
  if (!anchor || !anchor.href) return false;
  try {
    const url = new URL(anchor.href);
    return url.origin === window.location.origin && url.pathname !== window.location.pathname;
  } catch {
    return false;
  }
}

export function TopLoader() {
  const pathname = usePathname();
  const configured = useRef(false);

  useEffect(() => {
    if (!configured.current) {
      configureNProgress();
      configured.current = true;
    }
  }, []);

  useEffect(() => {
    NProgress.done();
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (isInternalLink(target)) NProgress.start();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
