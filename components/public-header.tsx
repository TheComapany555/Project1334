import Link from "next/link";
import Image from "next/image";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/shared/logout-button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Building2,
  Heart,
  GitCompareArrows,
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
  const isBroker = session?.user?.role === "broker";
  const hasDashboard = isAdmin || isBroker;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
            src={SALEBIZ_LOGO_URL}
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
                hasDashboard ? (
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                  >
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/saved">
                        <Heart className="h-4 w-4 mr-1" />
                        Saved
                      </Link>
                    </Button>
                    <LogoutButton variant="ghost" size="sm" />
                  </>
                )
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
                    <Link href="/auth/register">Register agency</Link>
                  </Button>
                </>
              )}
              <ThemeSwitcher />
            </nav>

            {/* Mobile nav — full variant */}
            <div className="flex sm:hidden items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[min(100vw-2rem,18rem)] p-0">
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-border">
                      <Image
                        src={SALEBIZ_LOGO_URL}
                        alt="Salebiz"
                        width={110}
                        height={33}
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                    <nav className="flex flex-col gap-1 p-4 flex-1">
                      <Link
                        href="/search"
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        Browse listings
                      </Link>
                      {isLoggedIn ? (
                        <>
                          {hasDashboard && (
                            <Link
                              href="/dashboard"
                              className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              Dashboard
                            </Link>
                          )}
                          <Link
                            href="/saved"
                            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            Saved Listings
                          </Link>
                          <Link
                            href="/compare"
                            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                            Compare
                          </Link>
                          {!hasDashboard && <LogoutButton asNavLink />}
                        </>
                      ) : (
                        <>
                          <Link
                            href="/auth/login"
                            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            Sign in
                          </Link>
                          <Link
                            href="/auth/register"
                            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-primary hover:bg-primary/8 transition-colors"
                          >
                            Register agency
                            <ArrowRight className="h-4 w-4 ml-auto" />
                          </Link>
                        </>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Admin panel
                        </Link>
                      )}
                    </nav>
                    <div className="px-4 pt-2 pb-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <Link href="/privacy" className="hover:text-foreground transition-colors">
                        Privacy
                      </Link>
                      <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms
                      </Link>
                    </div>
                    <div className="p-4 border-t border-border space-y-3">
                      {isLoggedIn ? (
                        hasDashboard ? (
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
                            <Link href="/saved">Saved Listings</Link>
                          </Button>
                        )
                      ) : (
                        <Button
                          asChild
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Link href="/auth/register">
                            Register agency
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
              {isLoggedIn && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/saved">
                      <Heart className="h-4 w-4 mr-1" />
                      Saved
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/compare">
                      <GitCompareArrows className="h-4 w-4 mr-1" />
                      Compare
                    </Link>
                  </Button>
                </>
              )}
              {isLoggedIn ? (
                hasDashboard ? (
                  <Button size="sm" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                ) : (
                  <LogoutButton variant="ghost" size="sm" />
                )
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/register?tab=buyer">Sign up</Link>
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

            {/* Compact mobile nav */}
            <div className="flex sm:hidden items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[min(100vw-2rem,18rem)] p-0">
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-border">
                      <Image
                        src={SALEBIZ_LOGO_URL}
                        alt="Salebiz"
                        width={110}
                        height={33}
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                    <nav className="flex flex-col gap-1 p-4 flex-1">
                      <Link
                        href="/search"
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        Browse listings
                      </Link>
                      {isLoggedIn ? (
                        <>
                          {hasDashboard && (
                            <Link
                              href="/dashboard"
                              className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              Dashboard
                            </Link>
                          )}
                          <Link
                            href="/saved"
                            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            Saved Listings
                          </Link>
                          <Link
                            href="/compare"
                            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                            Compare
                          </Link>
                          {!hasDashboard && <LogoutButton asNavLink />}
                        </>
                      ) : (
                        <Link
                          href="/auth/login"
                          className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          Sign in
                        </Link>
                      )}
                    </nav>
                    <div className="px-4 pt-2 pb-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <Link href="/privacy" className="hover:text-foreground transition-colors">
                        Privacy
                      </Link>
                      <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms
                      </Link>
                    </div>
                    <div className="p-4 border-t border-border space-y-3">
                      {isLoggedIn ? (
                        hasDashboard ? (
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
                            <Link href="/saved">Saved Listings</Link>
                          </Button>
                        )
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
