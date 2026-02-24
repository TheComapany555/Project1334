import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auth | Salebiz",
  description: "Sign in or create your Salebiz account",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
