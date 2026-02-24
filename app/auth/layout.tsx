import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Auth | Salebiz",
  description: "Sign in or create your Salebiz account",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Link href="/" className="mb-6">
        <Image src="/Salebiz.png" alt="Salebiz" width={140} height={42} className="h-10 w-auto object-contain" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
