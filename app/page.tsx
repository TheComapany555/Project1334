import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/Salebiz.png" alt="Salebiz" width={120} height={36} className="h-9 w-auto object-contain" priority />
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeSwitcher />
            {session?.user ? (
              session.user.role === "admin" ? (
                <Button asChild size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              ) : null
            ) : null}
            {session?.user ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Business for Sale
            </h1>
            <p className="text-muted-foreground text-lg">
              Buy and sell businesses across Australia. List your business or find your next opportunity.
            </p>
          </div>
          {!session?.user && (
            <Card className="text-left">
              <CardHeader>
                <CardTitle>Get started</CardTitle>
                <CardDescription>
                  Create a broker account to list businesses or sign in to manage your listings and enquiries.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/auth/register">Create broker account</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
