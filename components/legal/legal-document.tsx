import Link from "next/link";
import { LegalNavigation } from "@/components/legal/legal-navigation";

export type LegalSection = {
  id: string;
  number: string;
  title: string;
  content: React.ReactNode;
};

type LegalDocumentProps = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  effectiveDate: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  related: { href: string; label: string };
  contactEmail: string;
};

export function LegalDocument({
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  intro,
  sections,
  related,
  contactEmail,
}: LegalDocumentProps) {
  const navItems = sections.map((s) => ({
    id: s.id,
    number: s.number,
    title: s.title,
  }));

  return (
    <>
      {/* Minimal hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 pt-12 sm:pt-16 pb-10 sm:pb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Last updated {lastUpdated}
            <span className="mx-2 text-border" aria-hidden>
              ·
            </span>
            Effective {effectiveDate}
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14">
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <LegalNavigation items={navItems} related={related} />

          <article className="min-w-0">
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-foreground/85 prose-li:text-[15px] prose-li:leading-relaxed prose-li:my-1.5 prose-ul:my-4 prose-strong:font-semibold prose-strong:text-foreground prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
              <div className="lead text-[15px] leading-[1.75] text-muted-foreground">
                {intro}
              </div>
            </div>

            <div className="mt-12 space-y-14">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24"
                  aria-labelledby={`${s.id}-heading`}
                >
                  <div className="mb-5">
                    <p className="text-[11px] font-mono tabular-nums uppercase tracking-[0.18em] text-muted-foreground">
                      Section {s.number}
                    </p>
                    <h2
                      id={`${s.id}-heading`}
                      className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-foreground"
                    >
                      {s.title}
                    </h2>
                    <div className="mt-4 h-px bg-border" />
                  </div>
                  <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-foreground/85 prose-li:text-[15px] prose-li:leading-relaxed prose-li:my-1.5 prose-ul:my-4 prose-strong:font-semibold prose-strong:text-foreground prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
                    {s.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Quiet footer */}
            <footer className="mt-16 border-t border-border pt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Questions? Email{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-medium text-primary hover:underline"
                >
                  {contactEmail}
                </a>
                .
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href={related.href}
                  className="hover:text-foreground transition-colors"
                >
                  {related.label} →
                </Link>
                <a href="#top" className="hover:text-foreground transition-colors">
                  ↑ Top
                </a>
              </div>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
}
