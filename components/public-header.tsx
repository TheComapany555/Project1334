import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Building2,
  Menu,
  Search,
} from "lucide-react";

type Session = {
  user?: {
    role?: string;
    [key: string]: unknown;
  } | null;
} | null;

type PublicHeaderProps = {
  session?: Session;
  /** Max-width class for the inner container. Defaults to "max-w-7xl". */
  maxWidth?: string;
  /** Variant controls which nav items show. "full" = landing page, "compact" = inner pages. */
  variant?: "full" | "compact";
};

export function PublicHeader({
  session,
  maxWidth = "max-w-7xl",
  variant = "compact",
}: PublicHeaderProps) {
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div
        className={`mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-4 sm:px-6 ${maxWidth}`}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 transition-opacity duration-200 hover:opacity-75"
          aria-label="Salebiz home"
        >
          <Image
            src="https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg"
            alt="Salebiz"
            width={120}
            height={36}
            className="h-7 w-auto object-contain sm:h-9"
            priority
          />
        </Link>

        {variant === "full" ? (
          <>
            {/* Desktop nav — full variant (landing page) */}
            <nav className="hidden sm:flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/search">Browse listings</Link>
              </Button>
              {isAdmin && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              {isLoggedIn ? (
                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                  >
                    <Link href="/auth/register">List your business</Link>
                  </Button>
                </>
              )}
              <ThemeSwitcher />
            </nav>

            {/* Mobile nav — logo + hamburger only */}
            <div className="flex sm:hidden items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-border/50">
                      <Image
                        src="https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg"
                        alt="Salebiz"
                        width={110}
                        height={33}
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                    <nav className="flex flex-col gap-1 p-4 flex-1">
                      <Link
                        href="/search"
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        Browse listings
                      </Link>
                      {isLoggedIn ? (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Dashboard
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/auth/login"
                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            Sign in
                          </Link>
                          <Link
                            href="/auth/register"
                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-primary hover:bg-primary/8 transition-colors"
                          >
                            List your business
                            <ArrowRight className="h-4 w-4 ml-auto" />
                          </Link>
                        </>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Admin panel
                        </Link>
                      )}
                    </nav>
                    <div className="p-4 border-t border-border/50 space-y-3">
                      {isLoggedIn ? (
                        <Button
                          asChild
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Link href="/dashboard">Dashboard</Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Link href="/auth/register">
                            List your business
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Australia&apos;s trusted business marketplace
                        </p>
                        <ThemeSwitcher />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        ) : (
          <>
            {/* Compact desktop nav */}
            <div className="hidden sm:flex items-center gap-2">
              <ThemeSwitcher />
              {isLoggedIn ? (
                <Button size="sm" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/register">Create account</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/search">Browse listings</Link>
              </Button>
            </div>

            {/* Compact mobile nav — hamburger only */}
            <div className="flex sm:hidden items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-border/50">
                      <Image
                        src="https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg"
                        alt="Salebiz"
                        width={110}
                        height={33}
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                    <nav className="flex flex-col gap-1 p-4 flex-1">
                      <Link
                        href="/search"
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        Browse listings
                      </Link>
                      {isLoggedIn ? (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Dashboard
                        </Link>
                      ) : (
                        <Link
                          href="/auth/login"
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Sign in
                        </Link>
                      )}
                    </nav>
                    <div className="p-4 border-t border-border/50 space-y-3">
                      {isLoggedIn ? (
                        <Button
                          asChild
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Link href="/dashboard">Dashboard</Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Link href="/auth/register">
                            Create account
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Australia&apos;s trusted business marketplace
                        </p>
                        <ThemeSwitcher />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
