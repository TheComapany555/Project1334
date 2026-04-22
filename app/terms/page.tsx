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
  Scale,
  UserCircle2,
  KeyRound,
  Building2,
  Handshake,
  Search,
  CreditCard,
  Ban,
  ShieldAlert,
  Copyright,
  Puzzle,
  TriangleAlert,
  Gavel,
  HandCoins,
  LogOut,
  RefreshCw,
  MapPin,
  Mail,
  Clock,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  ScrollText,
  LayoutList,
  Receipt,
  MessageSquare,
  Database,
  BarChart2,
  Activity,
  Wrench,
  Globe2,
  CheckSquare,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your access to and use of the Salebiz marketplace, including broker, agency, and buyer responsibilities.",
  alternates: { canonical: "/terms" },
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
    id: "about",
    number: "01",
    title: "About the Salebiz Platform",
    icon: Building2,
    content: (
      <>
        <p>
          Salebiz is an online technology platform designed to connect verified
          business brokers with potential buyers of businesses. The Platform
          allows:
        </p>
        <ul>
          <li>Verified brokers to list businesses for sale</li>
          <li>Buyers to browse available listings</li>
          <li>Buyers to contact brokers</li>
          <li>Brokers to manage client communications</li>
          <li>Buyers to sign digital Non-Disclosure Agreements (NDAs)</li>
          <li>Storage of messages, documents, and listing materials</li>
          <li>Access to listing analytics and reporting</li>
        </ul>
        <p>
          Salebiz provides technology services only. Salebiz does not act as a
          broker or agent, provide financial or legal advice, participate in
          negotiations, or guarantee business sales. All transactions occur
          directly between brokers and buyers.
        </p>
      </>
    ),
  },
  {
    id: "acceptance",
    number: "02",
    title: "Acceptance of terms",
    icon: CheckSquare,
    content: (
      <>
        <p>By:</p>
        <ul>
          <li>Creating an account</li>
          <li>Accessing the Platform</li>
          <li>Browsing listings</li>
          <li>Uploading content</li>
          <li>Signing NDAs</li>
          <li>Communicating through the Platform</li>
        </ul>
        <p>
          you agree to these Terms. If you do not agree, you must immediately
          stop using the Platform.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    number: "03",
    title: "Eligibility to use the Platform",
    icon: UserCircle2,
    content: (
      <>
        <p>You must:</p>
        <ul>
          <li>Be at least 18 years old</li>
          <li>Provide accurate information</li>
          <li>Use the Platform lawfully</li>
          <li>Not impersonate any person</li>
        </ul>
        <p>Brokers must:</p>
        <ul>
          <li>Be legally authorised to act as brokers</li>
          <li>Maintain any required licences</li>
          <li>Provide verification documents when requested</li>
        </ul>
        <p>
          Salebiz reserves the right to verify user identity, request
          supporting documentation, refuse access, or suspend accounts at its
          sole discretion.
        </p>
      </>
    ),
  },
  {
    id: "broker-obligations",
    number: "04",
    title: "Broker verification and responsibilities",
    icon: Handshake,
    content: (
      <>
        <p>Only verified brokers may list businesses on Salebiz.</p>
        <p>Brokers are solely responsible for:</p>
        <ul>
          <li>Listing accuracy</li>
          <li>Financial information</li>
          <li>Images and documents</li>
          <li>Marketing statements</li>
          <li>Legal compliance</li>
          <li>Representations made to buyers</li>
        </ul>
        <p>
          Brokers warrant that all listing information is true, accurate, not
          misleading, and complies with all applicable laws. Salebiz does not
          independently verify listing information and accepts no responsibility
          for inaccurate listings, misleading content, or financial
          misrepresentation. All liability rests with the listing broker.
        </p>
      </>
    ),
  },
  {
    id: "buyer-obligations",
    number: "05",
    title: "Buyer responsibilities",
    icon: Search,
    content: (
      <>
        <p>Buyers agree to:</p>
        <ul>
          <li>Use the Platform responsibly</li>
          <li>Provide truthful information</li>
          <li>Respect confidentiality</li>
          <li>Comply with signed NDAs</li>
          <li>Use information only for legitimate purposes</li>
        </ul>
        <p>Buyers must not:</p>
        <ul>
          <li>Copy confidential business materials</li>
          <li>Share protected information</li>
          <li>Attempt to bypass brokers</li>
          <li>Misuse listing content</li>
        </ul>
        <p>Violation may result in account suspension or legal action.</p>
      </>
    ),
  },
  {
    id: "ndas",
    number: "06",
    title: "Non-Disclosure Agreements (NDAs)",
    icon: ScrollText,
    content: (
      <>
        <p>
          Certain listing information may require buyers to sign a
          Non-Disclosure Agreement. By signing an NDA, users agree to:
        </p>
        <ul>
          <li>Maintain confidentiality</li>
          <li>Use information solely for evaluation</li>
          <li>Not disclose information to third parties</li>
          <li>Protect confidential business data</li>
        </ul>
        <p>
          Signed NDAs are legally binding, stored electronically, and may be
          used as legal evidence. Failure to comply may result in legal
          enforcement.
        </p>
      </>
    ),
  },
  {
    id: "listings",
    number: "07",
    title: "Listings and content",
    icon: LayoutList,
    content: (
      <>
        <p>
          Brokers control their listings. Salebiz reserves the right to review,
          modify, remove, or reject listings at its discretion. Listings must
          be truthful, accurate, not misleading, and comply with applicable
          laws. Salebiz does not guarantee listing success, buyer engagement,
          or transaction completion.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    number: "08",
    title: "Fees and payments",
    icon: CreditCard,
    content: (
      <>
        <p>
          Salebiz charges fees only to brokers. Buyers are not charged fees to
          browse listings or contact brokers through the Platform. All broker
          payments must be conducted through the official website at{" "}
          <a
            href="https://www.salebiz.com.au"
            className="font-medium text-primary hover:underline"
          >
            salebiz.com.au
          </a>
          .
        </p>
        <p>Broker fees may include:</p>
        <ul>
          <li>Monthly subscription fees</li>
          <li>Per-listing fees</li>
          <li>Featured listing fees</li>
          <li>Promotional upgrade fees</li>
        </ul>
        <p>
          All fees must be paid, are processed through the Salebiz website, are
          non-refundable except where required by law, and may be changed from
          time to time. Failure to pay required fees may result in suspension
          of broker accounts, removal of listings, or restricted platform
          access.
        </p>
        <p>
          Salebiz does not handle payments related to the sale of businesses
          between brokers and buyers. All transaction payments between brokers
          and buyers occur independently of Salebiz.
        </p>
      </>
    ),
  },
  {
    id: "transaction-disclaimer",
    number: "09",
    title: "Platform transaction disclaimer",
    icon: Receipt,
    content: (
      <>
        <p>
          Salebiz is not a party to any business sale transaction between
          brokers and buyers. Salebiz does not handle sale funds, provide
          escrow services, guarantee transactions, or verify transaction
          completion. All negotiations, agreements, and payments relating to
          the sale of businesses occur directly between brokers and buyers.
        </p>
        <p>
          Salebiz accepts no responsibility for transaction disputes, failed
          transactions, financial losses, or buyer or broker conduct.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "10",
    title: "Acceptable use",
    icon: Ban,
    content: (
      <>
        <p>Users must not:</p>
        <ul>
          <li>Upload false or misleading listings</li>
          <li>Attempt unauthorised access</li>
          <li>Interfere with Platform systems</li>
          <li>Use automated scraping tools</li>
          <li>Upload malicious software</li>
          <li>Abuse messaging features</li>
        </ul>
        <p>
          Violation may result in immediate suspension, permanent termination,
          or legal enforcement.
        </p>
      </>
    ),
  },
  {
    id: "messaging",
    number: "11",
    title: "Messaging and communication",
    icon: MessageSquare,
    content: (
      <>
        <p>
          Salebiz enables communication between users. Users are responsible
          for message content, professional conduct, and accuracy of
          communication. Messages may be stored for security, legal, and
          operational purposes.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    number: "12",
    title: "Intellectual property",
    icon: Copyright,
    content: (
      <>
        <p>
          All Platform materials, including software, design, branding,
          databases, and system architecture, remain the property of THE
          COMPANY MARKETING PTY LTD. Users retain ownership of uploaded
          content; however, users grant Salebiz a licence to store content,
          display listings, promote listings, and operate the Platform.
        </p>
      </>
    ),
  },
  {
    id: "data-storage",
    number: "13",
    title: "Data storage and security",
    icon: Database,
    content: (
      <>
        <p>Salebiz stores user data, listings, messages, documents, and NDAs using Supabase and related secure cloud technologies. While reasonable security measures are used, no system is completely secure. Users accept inherent technology risks.</p>
      </>
    ),
  },
  {
    id: "analytics",
    number: "14",
    title: "Analytics and reporting",
    icon: BarChart2,
    content: (
      <>
        <p>Salebiz provides analytics tools which may include listing views, buyer interactions, and engagement metrics. Analytics are informational only, may not be exact, and do not guarantee outcomes.</p>
      </>
    ),
  },
  {
    id: "availability",
    number: "15",
    title: "Platform availability",
    icon: Activity,
    content: (
      <p>
        Salebiz does not guarantee continuous operation, uninterrupted service,
        or error-free functionality. Maintenance may occur at any time.
      </p>
    ),
  },
  {
    id: "liability",
    number: "16",
    title: "Limitation of liability",
    icon: Scale,
    content: (
      <>
        <p>To the maximum extent permitted by law, Salebiz is not liable for:</p>
        <ul>
          <li>Loss of profits</li>
          <li>Business losses</li>
          <li>Data loss</li>
          <li>Listing inaccuracies</li>
          <li>Buyer or broker behaviour</li>
          <li>Failed transactions</li>
        </ul>
        <p>Use of the Platform is at your own risk.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    number: "17",
    title: "Indemnity",
    icon: HandCoins,
    content: (
      <p>
        Users agree to indemnify Salebiz against claims, losses, damages, and
        legal costs resulting from breach of these Terms, misuse of the
        Platform, or false listings.
      </p>
    ),
  },
  {
    id: "termination",
    number: "18",
    title: "Suspension and termination",
    icon: LogOut,
    content: (
      <p>
        Salebiz may suspend or terminate accounts if Terms are breached, fraud
        is suspected, payment obligations are unmet, or illegal conduct occurs.
        Access may be removed without notice.
      </p>
    ),
  },
  {
    id: "third-parties",
    number: "19",
    title: "Third-party services",
    icon: Puzzle,
    content: (
      <>
        <p>Salebiz relies on third-party services, which may include:</p>
        <ul>
          <li>Cloud storage providers</li>
          <li>Payment processors</li>
          <li>Analytics tools</li>
        </ul>
        <p>Salebiz is not liable for third-party failures.</p>
      </>
    ),
  },
  {
    id: "platform-changes",
    number: "20",
    title: "Changes to the Platform",
    icon: Wrench,
    content: (
      <p>
        Salebiz may add new features, remove features, or modify services at
        any time.
      </p>
    ),
  },
  {
    id: "changes",
    number: "21",
    title: "Changes to terms",
    icon: RefreshCw,
    content: (
      <p>
        Salebiz may update these Terms. Updated Terms become effective once
        published. Continued use means acceptance.
      </p>
    ),
  },
  {
    id: "governing-law",
    number: "22",
    title: "Governing law",
    icon: Gavel,
    content: (
      <p>
        These Terms are governed by the laws of New South Wales, Australia. All
        disputes are subject to the courts of New South Wales.
      </p>
    ),
  },
  {
    id: "international",
    number: "23",
    title: "International use",
    icon: Globe2,
    content: (
      <p>
        Salebiz may operate internationally. Users outside Australia must
        comply with local laws and accept Australian jurisdiction.
      </p>
    ),
  },
  {
    id: "contact",
    number: "24",
    title: "Contact information",
    icon: Mail,
    content: (
      <>
        <p>Legal enquiries:</p>
        <div className="not-prose mt-4 rounded-xl border border-border bg-muted/40 p-5">
          <p className="text-sm font-semibold text-foreground">
            THE COMPANY MARKETING PTY LTD
          </p>
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
                <dt className="text-muted-foreground">Legal enquiries</dt>
                <dd>
                  <a
                    href="mailto:legal@salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    legal@salebiz.com.au
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
    icon: Handshake,
    title: "Marketplace, not broker",
    body: "Salebiz connects buyers and brokers. Transactions happen directly between the parties.",
  },
  {
    icon: ShieldCheck,
    title: "Clear obligations",
    body: "Brokers must be verified and list accurately. Buyers must respect NDAs and act in good faith.",
  },
  {
    icon: Gavel,
    title: "Australian law",
    body: "Governed by the laws of New South Wales, under the Australian Consumer Law.",
  },
];

export default async function TermsPage() {
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
                <BreadcrumbPage>Terms &amp; Conditions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-start gap-5">
            <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/20 shadow-sm">
              <Scale className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <Badge
                variant="secondary"
                className="mb-3 rounded-full font-normal"
              >
                Legal
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                Terms &amp; Conditions
              </h1>
              <p className="mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                The rules that govern your access to and use of the Salebiz
                platform, operated by THE COMPANY MARKETING PTY LTD.
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
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Privacy Policy
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            <Card className="overflow-hidden border-border shadow-sm">
              <CardContent className="p-6 sm:p-10">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  These Terms and Conditions (&ldquo;Terms&rdquo;) govern your
                  access to and use of the Salebiz platform
                  (&ldquo;Platform&rdquo;) operated by{" "}
                  <strong className="text-foreground">
                    THE COMPANY MARKETING PTY LTD
                  </strong>{" "}
                  (&ldquo;Salebiz&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
                  or &ldquo;our&rdquo;), 7/24 Hickson Rd, Millers Point NSW
                  2000, Australia. By accessing or using the Platform, you
                  agree to be legally bound by these Terms. If you do not
                  agree, you must not use the Platform.
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
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Read the Privacy Policy
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      How we collect, use, and protect your personal
                      information.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link href="/privacy">
                    View Privacy Policy
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
              <p>
                Questions? Email{" "}
                <a
                  href="mailto:legal@salebiz.com.au"
                  className="font-medium text-primary hover:underline"
                >
                  legal@salebiz.com.au
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
