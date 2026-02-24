import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/Salebiz.png" alt="Salebiz" width={120} height={36} className="h-9 w-auto object-contain" priority />
          </Link>
          <nav className="flex items-center gap-2">
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
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight">
            Business for Sale
          </h1>
          <p className="text-muted-foreground">
            Buy and sell businesses across Australia. List your business or find your next opportunity.
          </p>
          {!session?.user && (
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href="/auth/register">Create broker account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
