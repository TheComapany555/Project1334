import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Auth | Salebiz",
  description: "Sign in or create your Salebiz account",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" aria-label="Salebiz home">
            <Image
              src={SALEBIZ_LOGO_URL}
              alt="Salebiz"
              width={130}
              height={39}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Right: About panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground">
        {/* Grid background */}
        <div
          className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/90 to-transparent" aria-hidden />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          <blockquote className="space-y-6">
            <p className="text-2xl font-semibold leading-snug xl:text-3xl">
              Australia&apos;s trusted marketplace for buying and selling businesses.
            </p>
            <p className="text-base text-primary-foreground/70 leading-relaxed">
              Register your agency, list businesses for sale, and connect with
              thousands of qualified buyers across every state and territory.
            </p>
            <div className="flex items-center gap-6 pt-4 text-sm text-primary-foreground/60">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary-foreground">1,200+</span>
                <span>Active listings</span>
              </div>
              <div className="h-10 w-px bg-primary-foreground/15" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary-foreground">450+</span>
                <span>Verified brokers</span>
              </div>
              <div className="h-10 w-px bg-primary-foreground/15" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary-foreground">98%</span>
                <span>Satisfaction</span>
              </div>
            </div>
          </blockquote>
        </div>

        <div className="relative z-10 px-12 pb-8 xl:px-16">
          <p className="text-sm text-primary-foreground/50">
            Salebiz.com.au
          </p>
        </div>
      </div>
    </div>
  );
}
