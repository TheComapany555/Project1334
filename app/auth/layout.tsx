import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export const metadata: Metadata = {
  title: "Auth | Salebiz",
  description: "Sign in or create your Salebiz account",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-8 sm:p-6 relative">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <Link href="/" className="mb-6 shrink-0" aria-label="Salebiz home">
        <Image src="/Salebiz.png" alt="Salebiz" width={140} height={42} className="h-9 w-auto object-contain sm:h-10" priority />
      </Link>
      <div className="w-full max-w-md min-w-0">{children}</div>
    </div>
  );
}
