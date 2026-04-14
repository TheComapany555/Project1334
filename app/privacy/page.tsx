import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ShieldCheck,
  Database,
  Share2,
  Globe2,
  Clock,
  Lock,
  UserCheck,
  Baby,
  Smartphone,
  RefreshCw,
  Mail,
  FileText,
  ArrowUpRight,
  CheckCircle2,
  KeyRound,
  Ban,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Salebiz collects, uses, stores, and protects your personal information in accordance with the Australian Privacy Principles.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "14 April 2026";
const EFFECTIVE_DATE = "14 April 2026";

type Section = {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const sections: Section[] = [
  {
    id: "information-we-collect",
    number: "01",
    title: "Information we collect",
    icon: Database,
    content: (
      <>
        <p>We collect the following categories of information when you use Salebiz.</p>
        <ul>
          <li>
            <strong>Account information.</strong> Name, email address, hashed
            password, phone number, business or agency name, profile photo, and
            logo.
          </li>
          <li>
            <strong>Listing information.</strong> Business details, location,
            financials, photos, documents, and other content you choose to publish
            as a broker or agency.
          </li>
          <li>
            <strong>Enquiry and communication data.</strong> Messages, NDA
            signatures, enquiries, and call-click events submitted through the
            Service.
          </li>
          <li>
            <strong>Payment information.</strong> Billing details for
            subscriptions and featured listings. Card numbers are processed
            directly by Stripe and are never stored on our servers.
          </li>
          <li>
            <strong>Device and usage data.</strong> IP address, device type,
            operating system, app version, pages viewed, and analytics events.
          </li>
          <li>
            <strong>Cookies and similar technologies</strong> on the website for
            authentication, security, and anti-spam protection (Google reCAPTCHA).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    number: "02",
    title: "How we use your information",
    icon: UserCheck,
    content: (
      <>
        <p>We use personal information to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service.</li>
          <li>Authenticate users and keep accounts secure.</li>
          <li>Display listings and broker profiles, and facilitate enquiries.</li>
          <li>Process payments, subscriptions, and invoices.</li>
          <li>
            Send transactional emails such as verification, password reset,
            receipts, and notifications.
          </li>
          <li>
            Detect, prevent, and respond to fraud, abuse, and security incidents.
          </li>
          <li>Comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </>
    ),
  },
  {
    id: "when-we-share",
    number: "03",
    title: "When we share information",
    icon: Share2,
    content: (
      <>
        <p>
          Information you publish as a broker, including your name, agency,
          listings, and contact details, is publicly visible. Otherwise, we only
          share personal information with:
        </p>
        <ul>
          <li>
            <strong>Service providers</strong> that help us operate the Service,
            including Supabase (database and storage), Stripe (payments), Resend
            (email delivery), Google reCAPTCHA (spam protection), and our hosting
            provider. These providers are bound by confidentiality obligations and
            may only use data to provide services to us.
          </li>
          <li>
            <strong>Brokers you contact.</strong> When you submit an enquiry, your
            name, email, phone, and message are shared with the relevant broker
            and agency.
          </li>
          <li>
            <strong>Law enforcement or regulators</strong> where required by law,
            court order, or to protect the rights, safety, or property of Salebiz,
            our users, or the public.
          </li>
          <li>
            <strong>Acquirers</strong> in the event of a merger, acquisition, or
            sale of assets, subject to equivalent privacy protections.
          </li>
        </ul>
        <p>We do not sell personal information to third parties.</p>
      </>
    ),
  },
  {
    id: "international",
    number: "04",
    title: "International data storage",
    icon: Globe2,
    content: (
      <p>
        Salebiz is based in Australia. Some of our service providers, such as
        Stripe and Resend, may process data outside Australia. We take reasonable
        steps to ensure overseas recipients handle your information consistently
        with the Australian Privacy Principles.
      </p>
    ),
  },
  {
    id: "retention",
    number: "05",
    title: "Data retention",
    icon: Clock,
    content: (
      <p>
        We retain personal information for as long as your account is active and
        as needed to provide the Service, meet legal and tax obligations, resolve
        disputes, and enforce agreements. You can request account deletion at any
        time (see Your choices and rights).
      </p>
    ),
  },
  {
    id: "security",
    number: "06",
    title: "Security",
    icon: Lock,
    content: (
      <p>
        We use industry-standard measures to protect personal information,
        including TLS encryption in transit, encrypted storage at rest, hashed
        passwords, role-based access controls, and database row-level security.
        No online service can be guaranteed 100 percent secure, and you are
        responsible for keeping your password confidential.
      </p>
    ),
  },
  {
    id: "your-rights",
    number: "07",
    title: "Your choices and rights",
    icon: KeyRound,
    content: (
      <>
        <p>Under the Privacy Act 1988 (Cth) you may:</p>
        <ul>
          <li>Access the personal information we hold about you.</li>
          <li>Ask us to correct inaccurate or out-of-date information.</li>
          <li>
            Request deletion of your account and associated personal information.
          </li>
          <li>
            Opt out of non-essential marketing emails using the unsubscribe link.
          </li>
          <li>Lodge a complaint about how we handle your information.</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@salebiz.com.au">privacy@salebiz.com.au</a>. If
          you are not satisfied with our response, you may contact the Office of
          the Australian Information Commissioner at{" "}
          <a href="https://www.oaic.gov.au" target="_blank" rel="noreferrer">
            oaic.gov.au
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "children",
    number: "08",
    title: "Children",
    icon: Baby,
    content: (
      <p>
        The Service is intended for users aged 18 and over. We do not knowingly
        collect personal information from children.
      </p>
    ),
  },
  {
    id: "mobile-permissions",
    number: "09",
    title: "Mobile app permissions",
    icon: Smartphone,
    content: (
      <>
        <p>The Salebiz mobile app may request the following permissions:</p>
        <ul>
          <li>
            <strong>Photo library.</strong> To upload listing or profile images.
          </li>
          <li>
            <strong>Camera.</strong> To take new images for your listing or
            profile.
          </li>
          <li>
            <strong>Secure storage.</strong> To keep you signed in between
            sessions.
          </li>
          <li>
            <strong>Notifications.</strong> For transactional alerts only.
          </li>
        </ul>
        <p>You can disable any permission in your device settings at any time.</p>
      </>
    ),
  },
  {
    id: "changes",
    number: "10",
    title: "Changes to this policy",
    icon: RefreshCw,
    content: (
      <p>
        We may update this Privacy Policy from time to time. When we do, we will
        revise the Last updated date shown at the top of this page. Material
        changes will be communicated by email or an in-app notice before they
        take effect.
      </p>
    ),
  },
  {
    id: "contact",
    number: "11",
    title: "Contact us",
    icon: Mail,
    content: (
      <>
        <p>Questions about this Privacy Policy? We would like to hear from you.</p>
        <div className="not-prose mt-4 rounded-xl border border-border bg-muted/40 p-5">
          <p className="text-sm font-semibold text-foreground">Salebiz Pty Ltd</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Privacy enquiries</dt>
                <dd>
                  <a
                    href="mailto:privacy@salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    privacy@salebiz.com.au
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd>
                  <a
                    href="https://salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    salebiz.com.au
                  </a>
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </>
    ),
  },
];

const highlights = [
  {
    icon: ShieldCheck,
    title: "Privacy Act compliant",
    body: "We follow the Australian Privacy Principles under the Privacy Act 1988 (Cth).",
  },
  {
    icon: Lock,
    title: "Encrypted end-to-end",
    body: "TLS in transit, encrypted storage at rest, hashed passwords, and row-level security.",
  },
  {
    icon: Ban,
    title: "Never sold",
    body: "We do not sell your personal information to third parties. Ever.",
  },
];

export default async function PrivacyPolicyPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader session={session} variant="compact" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.06] via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/12%),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Privacy Policy</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-start gap-5">
            <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/20 shadow-sm">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <Badge
                variant="secondary"
                className="mb-3 rounded-full font-normal"
              >
                Legal
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                Privacy Policy
              </h1>
              <p className="mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                How Salebiz collects, uses, and protects your personal
                information. Written in plain English and aligned with the
                Australian Privacy Principles.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last updated {LAST_UPDATED}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Effective {EFFECTIVE_DATE}
                </span>
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.title}
                  className="rounded-xl border border-border bg-background/70 p-4 backdrop-blur-sm shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      {h.title}
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {h.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>
              <nav className="flex flex-col gap-0.5 border-l border-border">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="group -ml-px flex items-center gap-3 border-l border-transparent pl-4 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:text-foreground focus-visible:border-primary transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground/70 group-hover:text-primary">
                      {s.number}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </a>
                ))}
              </nav>

              <Separator className="my-6" />

              <div className="space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Related
                </p>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Terms of Service
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            <Card className="overflow-hidden border-border shadow-sm">
              <CardContent className="p-6 sm:p-10">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  Salebiz Pty Ltd (&ldquo;Salebiz&rdquo;, &ldquo;we&rdquo;, or
                  &ldquo;us&rdquo;) operates the website at{" "}
                  <a
                    href="https://salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    salebiz.com.au
                  </a>{" "}
                  and the Salebiz mobile application (together, the
                  &ldquo;Service&rdquo;). This policy explains what information we
                  collect, why we collect it, and the choices you have about how
                  we use it.
                </p>

                <Separator className="my-8" />

                <div className="space-y-12">
                  {sections.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                      <section
                        key={s.id}
                        id={s.id}
                        className="scroll-mt-24"
                        aria-labelledby={`${s.id}-heading`}
                      >
                        <div className="mb-5 flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-[11px] font-mono tabular-nums tracking-wider text-muted-foreground">
                              {s.number}
                            </span>
                            <h2
                              id={`${s.id}-heading`}
                              className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground"
                            >
                              {s.title}
                            </h2>
                          </div>
                        </div>
                        <div className="prose prose-neutral dark:prose-invert max-w-[68ch] prose-p:leading-relaxed prose-p:text-[15px] prose-li:my-1 prose-li:text-[15px] prose-li:leading-relaxed prose-strong:text-foreground prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline text-foreground/90">
                          {s.content}
                        </div>
                        {idx < sections.length - 1 && (
                          <Separator className="mt-10" />
                        )}
                      </section>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Cross-link CTA */}
            <Card className="mt-8 border-border bg-gradient-to-br from-muted/40 via-muted/20 to-transparent">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Read the Terms of Service
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The rules that govern how you use Salebiz.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link href="/terms">
                    View Terms
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
              <p>
                You can also reach us at{" "}
                <a
                  href="mailto:privacy@salebiz.com.au"
                  className="font-medium text-primary hover:underline"
                >
                  privacy@salebiz.com.au
                </a>
                .
              </p>
              <a
                href="#top"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Back to top
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
