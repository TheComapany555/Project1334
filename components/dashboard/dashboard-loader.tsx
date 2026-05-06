"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";

/**
 * Brief branded splash screen shown once after login.
 * Uses sessionStorage so it only triggers once per browser session
 * (i.e. after a fresh login, not on subsequent navigations).
 */
export function DashboardLoader({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const key = "salebiz_dash_loaded";
    if (typeof window === "undefined") return;

    if (sessionStorage.getItem(key)) {
      // Already shown this session (e.g. after Strict Mode remount) — skip loader
      setShowLoader(false);
      setDone(true);
      return;
    }

    // First dashboard visit this session — show loader
    sessionStorage.setItem(key, "1");
    setShowLoader(true);

    const fadeTimer = setTimeout(() => setFadeOut(true), 400);
    const doneTimer = setTimeout(() => {
      setShowLoader(false);
      setDone(true);
    }, 700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <>
      {showLoader && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-300 ${
            fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <Image
            src={SALEBIZ_LOGO_URL}
            alt="Salebiz"
            width={140}
            height={42}
            className="h-10 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading your dashboard…</span>
          </div>
        </div>
      )}
      {done && children}
    </>
  );
}
