import type { Metadata } from "next";
import { SiteGateForm } from "@/components/site-gate/site-gate-form";

export const metadata: Metadata = {
  title: "Private — Salebiz",
  robots: { index: false, follow: false },
};

// Shown (via middleware rewrite) to any visitor who hasn't passed the
// pre-launch site-wide password gate. Entering the correct password sets the
// access cookie and reloads the originally requested page.
export default function SiteLockedPage() {
  return <SiteGateForm />;
}
