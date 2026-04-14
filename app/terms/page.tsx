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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Salebiz marketplace, including broker, agency, and buyer responsibilities.",
  alternates: { canonical: "/terms" },
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
    id: "eligibility",
    number: "01",
    title: "Who can use Salebiz",
    icon: UserCircle2,
    content: (
      <p>
        You must be at least 18 years old and able to enter into a legally
        binding contract under Australian law. If you register on behalf of a
        business or agency, you warrant that you are authorised to bind that
        entity.
      </p>
    ),
  },
  {
    id: "accounts",
    number: "02",
    title: "Accounts",
    icon: KeyRound,
    content: (
      <p>
        You are responsible for maintaining the confidentiality of your
        credentials and for all activity under your account. Please notify us
        immediately of any unauthorised access. We may suspend or terminate
        accounts that violate these Terms or are used unlawfully.
      </p>
    ),
  },
  {
    id: "what-salebiz-is",
    number: "03",
    title: "What Salebiz is (and is not)",
    icon: Building2,
    content: (
      <p>
        Salebiz is a marketplace that connects brokers and agencies listing
        businesses for sale with prospective buyers. We do not own, sell, broker,
        inspect, or guarantee the quality, legality, safety, or accuracy of any
        listing. Transactions are between the buyer and the broker or seller.
        You should obtain independent legal, financial, and due diligence advice
        before entering any transaction.
      </p>
    ),
  },
  {
    id: "broker-obligations",
    number: "04",
    title: "Broker and agency obligations",
    icon: Handshake,
    content: (
      <ul>
        <li>
          You must hold any licence or registration required by Australian state
          or territory law to act as a business broker or real-estate agent.
        </li>
        <li>
          Listings must be accurate, current, and not misleading. Financial
          figures, lease details, and photos must be truthful.
        </li>
        <li>
          You must have the right to upload any documents, logos, or images you
          post. You grant Salebiz a non-exclusive licence to host, display, and
          distribute that content as part of the Service.
        </li>
        <li>
          You must not list prohibited businesses, scams, or anything that
          violates Australian law.
        </li>
        <li>
          You must respond to buyer enquiries professionally and respect any NDA
          you issue or sign through the Service.
        </li>
      </ul>
    ),
  },
  {
    id: "buyer-obligations",
    number: "05",
    title: "Buyer obligations",
    icon: Search,
    content: (
      <ul>
        <li>Use your real name and contact details when submitting enquiries.</li>
        <li>
          Respect the confidentiality of information shared under an NDA. Misuse
          may result in legal action by the broker or seller.
        </li>
        <li>Do not harass brokers or send unsolicited commercial messages.</li>
      </ul>
    ),
  },
  {
    id: "payments",
    number: "06",
    title: "Subscriptions and payments",
    icon: CreditCard,
    content: (
      <>
        <p>
          Agencies may purchase subscriptions, listing tiers, or featured
          placements through Stripe. Prices are shown in AUD and include GST
          where applicable. Subscriptions renew automatically until cancelled.
          Cancellation takes effect at the end of the current billing period,
          and we do not provide refunds for partial periods except where
          required by Australian Consumer Law.
        </p>
        <p>
          Featured listings and tier upgrades are one-off purchases tied to a
          specific listing and run for the duration stated at checkout.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "07",
    title: "Acceptable use",
    icon: Ban,
    content: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Post false, misleading, defamatory, or unlawful content.</li>
          <li>Scrape, crawl, or reverse-engineer the Service.</li>
          <li>
            Attempt to bypass authentication, rate limits, or security controls.
          </li>
          <li>Use the Service to send spam or unsolicited marketing.</li>
          <li>Infringe any intellectual property or privacy rights.</li>
          <li>Upload malware or disruptive code.</li>
        </ul>
      </>
    ),
  },
  {
    id: "moderation",
    number: "08",
    title: "Content moderation",
    icon: ShieldAlert,
    content: (
      <p>
        We may remove any listing, message, image, or document, suspend
        accounts, or restrict visibility at our discretion where content
        breaches these Terms, is suspected to be fraudulent, or is flagged by a
        user.
      </p>
    ),
  },
  {
    id: "ip",
    number: "09",
    title: "Intellectual property",
    icon: Copyright,
    content: (
      <p>
        The Service, including its design, logos, code, and trademarks, is owned
        by Salebiz and its licensors. You retain ownership of content you upload
        but grant us a non-exclusive, royalty-free, worldwide licence to host
        and display it for the purpose of operating the Service.
      </p>
    ),
  },
  {
    id: "third-parties",
    number: "10",
    title: "Third-party services",
    icon: Puzzle,
    content: (
      <p>
        The Service integrates with third parties including Stripe, Supabase,
        Resend, and Google reCAPTCHA. Your use of those services is subject to
        their own terms and privacy policies.
      </p>
    ),
  },
  {
    id: "disclaimers",
    number: "11",
    title: "Disclaimers",
    icon: TriangleAlert,
    content: (
      <p>
        The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. To the maximum extent permitted by law, Salebiz
        disclaims all warranties, whether express or implied, including fitness
        for purpose and non-infringement. We do not warrant that the Service
        will be uninterrupted or error free. Nothing in these Terms excludes
        rights you have under the Australian Consumer Law that cannot lawfully
        be excluded.
      </p>
    ),
  },
  {
    id: "liability",
    number: "12",
    title: "Limitation of liability",
    icon: Scale,
    content: (
      <p>
        To the maximum extent permitted by law, Salebiz&rsquo;s total liability
        arising out of or in connection with the Service is limited to the fees
        you paid us in the 12 months preceding the claim. We are not liable for
        indirect, incidental, special, consequential, or punitive damages, or
        for loss of profits, revenue, data, or business opportunity.
      </p>
    ),
  },
  {
    id: "indemnity",
    number: "13",
    title: "Indemnity",
    icon: HandCoins,
    content: (
      <p>
        You agree to indemnify and hold Salebiz harmless from any claims,
        damages, liabilities, and costs arising from your content, your use of
        the Service, or your breach of these Terms.
      </p>
    ),
  },
  {
    id: "termination",
    number: "14",
    title: "Termination",
    icon: LogOut,
    content: (
      <p>
        You may close your account at any time. We may suspend or terminate your
        access immediately if you breach these Terms or if we are required to do
        so by law. Provisions that by their nature survive termination,
        including intellectual property, disclaimers, liability, and indemnity,
        continue to apply.
      </p>
    ),
  },
  {
    id: "changes",
    number: "15",
    title: "Changes",
    icon: RefreshCw,
    content: (
      <p>
        We may update these Terms from time to time. Material changes will be
        notified in app or by email. Continued use of the Service after changes
        take effect constitutes acceptance.
      </p>
    ),
  },
  {
    id: "governing-law",
    number: "16",
    title: "Governing law",
    icon: Gavel,
    content: (
      <p>
        These Terms are governed by the laws of New South Wales, Australia. You
        submit to the exclusive jurisdiction of the courts of New South Wales
        for any dispute.
      </p>
    ),
  },
  {
    id: "contact",
    number: "17",
    title: "Contact",
    icon: Mail,
    content: (
      <>
        <p>Questions about these Terms? We are happy to help.</p>
        <div className="not-prose mt-4 rounded-xl border border-border bg-muted/40 p-5">
          <p className="text-sm font-semibold text-foreground">
            Salebiz Pty Ltd
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Support</dt>
                <dd>
                  <a
                    href="mailto:support@salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    support@salebiz.com.au
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-muted-foreground">Jurisdiction</dt>
                <dd className="text-foreground">
                  New South Wales, Australia
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
    body: "Brokers must be licensed and list accurately. Buyers must respect NDAs and act in good faith.",
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
                <BreadcrumbPage>Terms of Service</BreadcrumbPage>
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
                Terms of Service
              </h1>
              <p className="mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                The rules that govern your use of Salebiz, the Australian
                marketplace for buying and selling businesses.
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
                  These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
                  the Salebiz website at{" "}
                  <a
                    href="https://salebiz.com.au"
                    className="font-medium text-primary hover:underline"
                  >
                    salebiz.com.au
                  </a>{" "}
                  and the Salebiz mobile application (together, the
                  &ldquo;Service&rdquo;), operated by Salebiz Pty Ltd. By
                  creating an account or using the Service you agree to these
                  Terms. If you do not agree, please do not use the Service.
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
                      How we collect, use, and protect your personal information.
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
                  href="mailto:support@salebiz.com.au"
                  className="font-medium text-primary hover:underline"
                >
                  support@salebiz.com.au
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
