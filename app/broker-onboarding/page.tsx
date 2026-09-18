import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicHeader } from "@/components/public-header";
import { OnboardingRequestForm } from "./onboarding-request-form";
import { ClipboardList, PhoneCall, Rocket } from "lucide-react";

export const metadata: Metadata = {
  title: "We'll set up your agency for you",
  description:
    "Prefer not to set it up yourself? The Salebiz team will onboard your agency, load your listings, and hand you the keys.",
  // Standing SEO policy for this project: only the homepage, /privacy, /terms
  // and real broker/agency profiles are indexed.
  robots: { index: false, follow: true },
};

const STEPS = [
  {
    icon: ClipboardList,
    title: "Tell us where you're at",
    body: "Send the form below — your agency, roughly how many businesses you have listed, and anything unusual about your setup.",
  },
  {
    icon: PhoneCall,
    title: "We call you within one business day",
    body: "A real person walks through what you need, collects your listing details however you already keep them, and answers your questions.",
  },
  {
    icon: Rocket,
    title: "We build it and hand it over",
    body: "We create your agency, load your listings and photos, set up your team's logins, and show you around. You don't touch a spreadsheet.",
  },
];

export default async function BrokerOnboardingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="bg-background min-h-svh">
      <PublicHeader session={session} variant="compact" maxWidth="max-w-6xl" />

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
          {/* ── Left: the pitch ── */}
          <div>
            <h1 className="text-foreground text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
              We&apos;ll set up your agency for you.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-[52ch] text-lg leading-relaxed">
              You don&apos;t have to learn another platform to start selling
              businesses on Salebiz. Tell us what you&apos;ve got and our team
              does the setup — listings, photos, team logins, the lot.
            </p>

            <ol className="mt-12 grid gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-5">
                  <span
                    className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    aria-hidden
                  >
                    <step.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-foreground font-medium">
                      <span className="text-muted-foreground mr-2 tabular-nums">
                        {i + 1}.
                      </span>
                      {step.title}
                    </h2>
                    <p className="text-muted-foreground mt-1.5 max-w-[56ch] text-sm leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-muted-foreground border-border mt-12 max-w-[56ch] border-t pt-8 text-sm leading-relaxed">
              Already started an account and got stuck partway? Use the same
              form and mention it in the message — we&apos;ll pick up where you
              left off.
            </p>
          </div>

          {/* ── Right: the form ── */}
          <div className="lg:pt-2">
            <OnboardingRequestForm />
          </div>
        </div>
      </main>
    </div>
  );
}
