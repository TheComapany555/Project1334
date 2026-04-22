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
  RefreshCw,
  Mail,
  FileText,
  ArrowUpRight,
  CheckCircle2,
  KeyRound,
  Ban,
  Building2,
  MapPin,
  ClipboardList,
  Target,
  Monitor,
  ExternalLink,
  FolderOpen,
  PenLine,
  Bell,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Salebiz collects, uses, stores, and protects your personal information in accordance with the Australian Privacy Principles.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "21 April 2026";
const EFFECTIVE_DATE = "21 April 2026";

type Section = {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const sections: Section[] = [
  {
    id: "company-details",
    number: "01",
    title: "Company details",
    icon: Building2,
    content: (
      <div className="not-prose rounded-xl border border-border bg-muted/40 p-5">
        <p className="text-sm font-semibold text-foreground">THE COMPANY MARKETING PTY LTD</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <dt className="text-muted-foreground">Trading Name</dt>
              <dd className="text-foreground font-medium">Salebiz</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-foreground">7/24 Hickson Rd<br />Millers Point NSW 2000<br />Australia</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <dt className="text-muted-foreground">Privacy Contact Email</dt>
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
        </dl>
      </div>
    ),
  },
  {
    id: "information-we-collect",
    number: "02",
    title: "Types of personal information collected",
    icon: Database,
    content: (
      <>
        <p>
          Salebiz collects personal information necessary to operate the
          Platform and provide services to users. Personal information collected
          may include:
        </p>
        <p>
          <strong>Identity Information</strong>
        </p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Residential or business address</li>
          <li>Business or agency name</li>
          <li>Professional licence details</li>
          <li>Identification documents provided for verification</li>
        </ul>
        <p>
          <strong>Account Information</strong>
        </p>
        <ul>
          <li>Username</li>
          <li>Password (stored in encrypted form)</li>
          <li>Profile information</li>
          <li>Account settings</li>
          <li>Login activity</li>
        </ul>
        <p>
          <strong>Broker Information</strong>
        </p>
        <ul>
          <li>Business listing details</li>
          <li>Agency details</li>
          <li>Professional credentials</li>
          <li>Listing content, uploaded documents, images, and business descriptions</li>
          <li>Financial summary information</li>
        </ul>
        <p>
          <strong>Buyer Information</strong>
        </p>
        <ul>
          <li>Contact details and communication history</li>
          <li>Buyer preferences</li>
          <li>Signed Non-Disclosure Agreements</li>
          <li>Access permissions</li>
        </ul>
        <p>
          <strong>Communication Data</strong>
        </p>
        <ul>
          <li>Messages sent through the Platform</li>
          <li>Attachments, uploaded files, and communication history</li>
        </ul>
        <p>
          <strong>Payment Information</strong>
        </p>
        <ul>
          <li>Billing information, payment history, subscription details, and transaction records</li>
          <li>Full payment card details are not stored by Salebiz — payment processing is handled through secure third-party payment systems.</li>
        </ul>
        <p>
          <strong>Technical and Usage Information</strong>
        </p>
        <ul>
          <li>IP address, device information, browser type, and operating system</li>
          <li>Access times, platform usage activity, and session data</li>
        </ul>
        <p>
          <strong>Analytics Information</strong>
        </p>
        <ul>
          <li>Listing views, buyer interactions, user engagement, and platform performance data</li>
        </ul>
      </>
    ),
  },
  {
    id: "methods-of-collection",
    number: "03",
    title: "Methods of collection",
    icon: ClipboardList,
    content: (
      <>
        <p>
          Personal information is collected directly and indirectly through
          user interaction with the Platform. Information may be collected:
        </p>
        <ul>
          <li>When users create accounts</li>
          <li>When brokers upload listings</li>
          <li>When buyers contact brokers</li>
          <li>When NDAs are signed</li>
          <li>When files are uploaded</li>
          <li>When messages are sent</li>
          <li>When subscriptions are purchased</li>
          <li>When users browse the Platform</li>
          <li>Through cookies and tracking technologies</li>
        </ul>
      </>
    ),
  },
  {
    id: "purpose-of-collection",
    number: "04",
    title: "Purpose of collection",
    icon: Target,
    content: (
      <>
        <p>Salebiz collects personal information to operate and maintain the Platform. Personal information is used to:</p>
        <ul>
          <li>Create and manage user accounts</li>
          <li>Verify broker identity</li>
          <li>Publish and manage listings</li>
          <li>Facilitate communication between users</li>
          <li>Manage client interactions</li>
          <li>Enable NDA signing workflows</li>
          <li>Process payments</li>
          <li>Provide analytics services</li>
          <li>Improve platform performance</li>
          <li>Maintain platform security</li>
          <li>Detect and prevent fraud</li>
          <li>Enforce legal rights</li>
          <li>Comply with legal obligations</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    number: "05",
    title: "Use of personal information",
    icon: UserCheck,
    content: (
      <>
        <p>Personal information may be used for:</p>
        <ul>
          <li>Providing Platform services</li>
          <li>Managing user accounts</li>
          <li>Facilitating communication</li>
          <li>Monitoring usage activity</li>
          <li>Responding to enquiries</li>
          <li>Improving platform features</li>
          <li>Maintaining operational records</li>
          <li>Providing service notifications</li>
          <li>Enforcing contractual rights</li>
        </ul>
        <p>Salebiz does not sell personal information to third parties.</p>
      </>
    ),
  },
  {
    id: "disclosure",
    number: "06",
    title: "Disclosure of personal information",
    icon: Share2,
    content: (
      <>
        <p>
          Salebiz may disclose personal information to third parties where
          necessary to operate the Platform. This may include disclosure to:
        </p>
        <p>
          <strong>Service Providers</strong> — including cloud storage
          providers, hosting providers, payment processors, analytics providers,
          email delivery services, and security providers. Platform
          infrastructure may utilise services including Supabase and associated
          cloud technologies.
        </p>
        <p>
          <strong>Legal Requirements</strong> — personal information may be
          disclosed where required by law, court order, to regulatory
          authorities, to prevent fraud, or to protect legal rights.
        </p>
        <p>
          <strong>Business Transfers</strong> — if Salebiz undergoes a business
          sale, merger, restructure, or asset transfer, personal information may
          be transferred to the acquiring entity.
        </p>
      </>
    ),
  },
  {
    id: "security",
    number: "07",
    title: "Storage and security",
    icon: Lock,
    content: (
      <>
        <p>
          Salebiz takes reasonable steps to protect personal information from
          misuse, interference, loss, unauthorised access, modification, or
          disclosure. Security measures include:
        </p>
        <ul>
          <li>Encrypted data storage</li>
          <li>Secure server infrastructure</li>
          <li>Access controls</li>
          <li>Authentication processes</li>
          <li>Monitoring of system activity</li>
        </ul>
        <p>
          Personal information may be stored on secure cloud infrastructure
          located within Australia or internationally. While reasonable
          safeguards are implemented, no data transmission or storage system
          can be guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    number: "08",
    title: "Data retention",
    icon: Clock,
    content: (
      <>
        <p>
          Personal information is retained only for as long as necessary to
          fulfil operational, legal, and regulatory requirements. Salebiz may
          retain account records, listing records, messages, NDAs, and payment
          records even after account closure where required by law or legitimate
          business purposes.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    number: "09",
    title: "Cookies and tracking technologies",
    icon: Monitor,
    content: (
      <>
        <p>
          Salebiz uses cookies and similar technologies to support Platform
          functionality. Cookies may be used to:
        </p>
        <ul>
          <li>Maintain login sessions</li>
          <li>Enable platform functionality</li>
          <li>Monitor system performance</li>
          <li>Analyse user behaviour</li>
          <li>Improve user experience</li>
        </ul>
        <p>
          Users may adjust browser settings to restrict cookie usage; however,
          certain features of the Platform may not function correctly if
          cookies are disabled.
        </p>
      </>
    ),
  },
  {
    id: "third-party-links",
    number: "10",
    title: "Third-party links",
    icon: ExternalLink,
    content: (
      <p>
        The Platform may contain links to third-party websites or services.
        Salebiz does not control third-party websites and is not responsible
        for their privacy practices or content. Users accessing third-party
        websites do so at their own risk.
      </p>
    ),
  },
  {
    id: "access",
    number: "11",
    title: "Access to personal information",
    icon: FolderOpen,
    content: (
      <p>
        Users may request access to personal information held by Salebiz.
        Requests must be submitted in writing to{" "}
        <a href="mailto:privacy@salebiz.com.au" className="font-medium text-primary hover:underline">
          privacy@salebiz.com.au
        </a>
        . Salebiz may require verification of identity before releasing
        information.
      </p>
    ),
  },
  {
    id: "correction",
    number: "12",
    title: "Correction of personal information",
    icon: PenLine,
    content: (
      <p>
        Users may request correction of inaccurate or incomplete personal
        information. Salebiz will take reasonable steps to update records where
        appropriate.
      </p>
    ),
  },
  {
    id: "overseas",
    number: "13",
    title: "Overseas disclosure",
    icon: Globe2,
    content: (
      <p>
        Personal information may be stored or processed outside Australia where
        necessary to operate the Platform. This may include international cloud
        infrastructure and service providers. Where overseas disclosure occurs,
        reasonable steps are taken to ensure personal information is handled
        securely.
      </p>
    ),
  },
  {
    id: "marketing",
    number: "14",
    title: "Marketing communications",
    icon: Bell,
    content: (
      <>
        <p>Salebiz may send communications relating to:</p>
        <ul>
          <li>Platform updates</li>
          <li>System notifications</li>
          <li>Service announcements</li>
        </ul>
        <p>
          Users may opt out of marketing communications where permitted.
          Service-related communications may still be delivered.
        </p>
      </>
    ),
  },
  {
    id: "children",
    number: "15",
    title: "Children&apos;s privacy",
    icon: Baby,
    content: (
      <p>
        The Platform is not intended for individuals under the age of 18.
        Salebiz does not knowingly collect personal information from minors.
        Accounts identified as belonging to minors may be removed.
      </p>
    ),
  },
  {
    id: "data-breach",
    number: "16",
    title: "Data breach management",
    icon: ShieldAlert,
    content: (
      <>
        <p>If a data breach occurs, Salebiz will take reasonable steps to:</p>
        <ul>
          <li>Investigate the breach</li>
          <li>Contain the breach</li>
          <li>Assess the risk</li>
          <li>Notify affected individuals where required</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
      </>
    ),
  },
  {
    id: "changes",
    number: "17",
    title: "Changes to this privacy policy",
    icon: RefreshCw,
    content: (
      <p>
        Salebiz may update this Privacy Policy from time to time. Updated
        versions become effective once published on the Platform. Continued use
        of the Platform indicates acceptance of the updated policy.
      </p>
    ),
  },
  {
    id: "complaints",
    number: "18",
    title: "Complaints",
    icon: AlertCircle,
    content: (
      <>
        <p>
          If a user believes their privacy rights have been breached, a
          complaint may be submitted to{" "}
          <a href="mailto:privacy@salebiz.com.au" className="font-medium text-primary hover:underline">
            privacy@salebiz.com.au
          </a>
          . Complaints will be reviewed and addressed in accordance with
          applicable privacy laws.
        </p>
        <p>
          If a complaint is not resolved, it may be referred to the Office of
          the Australian Information Commissioner (OAIC) at{" "}
          <a
            href="https://www.oaic.gov.au"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            oaic.gov.au
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "contact",
    number: "19",
    title: "Contact details",
    icon: Mail,
    content: (
      <>
        <p>Privacy enquiries:</p>
        <div className="not-prose mt-4 rounded-xl border border-border bg-muted/40 p-5">
          <p className="text-sm font-semibold text-foreground">THE COMPANY MARKETING PTY LTD</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="text-foreground">
                  7/24 Hickson Rd<br />Millers Point NSW 2000<br />Australia
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
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
                How Salebiz collects, uses, stores, and protects your personal
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
                  Terms &amp; Conditions
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            <Card className="overflow-hidden border-border shadow-sm">
              <CardContent className="p-6 sm:p-10">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  This Privacy Policy explains how{" "}
                  <strong className="text-foreground">
                    THE COMPANY MARKETING PTY LTD
                  </strong>{" "}
                  (&ldquo;Salebiz&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
                  or &ldquo;our&rdquo;) collects, uses, stores, and protects
                  personal information through the Salebiz platform
                  (&ldquo;Platform&rdquo;). This Privacy Policy applies to all
                  users of{" "}
                  <a
                    href="https://www.salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    salebiz.com.au
                  </a>{" "}
                  including brokers, buyers, and visitors.
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
                      Read the Terms &amp; Conditions
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
