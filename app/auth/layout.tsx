import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthCanvas } from "@/components/auth/auth-canvas";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Auth | Salebiz",
  description: "Sign in or create your Salebiz account",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── Left: the form ── */}
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex justify-center lg:justify-start">
          <Link
            href="/"
            aria-label="Salebiz home"
            className="focus-visible:ring-ring/60 inline-flex rounded-md opacity-90 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-4"
          >
            <Image
              src={SALEBIZ_LOGO_URL}
              alt="Salebiz"
              width={130}
              height={39}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="auth-enter w-full max-w-[26rem]">{children}</div>
        </main>

        <footer className="text-muted-foreground flex flex-col items-center gap-3 text-xs sm:flex-row sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Secured with 256-bit encryption
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
          </nav>
        </footer>
      </div>

      {/* ── Right: animated brand canvas (decorative; hidden on small screens) ──
          Sticky + viewport-height so the panel stays composed on short screens
          and never stretches the page when the form column grows. */}
      <aside className="relative hidden lg:block">
        <div className="sticky top-0 h-svh overflow-hidden">
          <AuthCanvas />

          <div className="relative z-10 flex h-full flex-col justify-end p-12 xl:p-16">
            <p className="max-w-[18ch] text-[clamp(2rem,2.6vw+0.5rem,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white">
              Australia&apos;s trusted marketplace for buying and selling
              businesses.
            </p>

            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-emerald-50/70">
              List your business, reach qualified buyers in every state and
              territory, and run the whole sale in one place.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
