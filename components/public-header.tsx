import Link from "next/link";
import Image from "next/image";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserMenu } from "@/components/shared/user-menu";
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
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Session = {
  user?: {
    role?: string;
    name?: string | null;
    email?: string | null;
    [key: string]: unknown;
  } | null;
} | null;

type PublicHeaderProps = {
  session?: Session;
  /** Max-width class for the inner container. Defaults to "max-w-7xl". */
  maxWidth?: string;
  /** "full" = landing page (more prominent CTAs), "compact" = inner pages. */
  variant?: "full" | "compact";
};

export function PublicHeader({
  session,
  maxWidth = "max-w-7xl",
  variant = "compact",
}: PublicHeaderProps) {
  const role = (session?.user?.role ?? null) as
    | "broker"
    | "admin"
    | "user"
    | null;
  const isLoggedIn = !!session?.user && !!role;
  const isBuyer = role === "user";
  const isStaff = role === "broker" || role === "admin";

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div
          className={`mx-auto flex h-14 sm:h-16 items-center justify-between gap-3 px-4 sm:px-6 ${maxWidth}`}
        >
          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
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

          {/* ── Desktop nav ── */}
          <DesktopNav
            session={session}
            isLoggedIn={isLoggedIn}
            isBuyer={isBuyer}
            isStaff={isStaff}
            role={role}
            variant={variant}
          />

          {/* ── Mobile nav ── */}
          <MobileNav
            session={session}
            isLoggedIn={isLoggedIn}
            isBuyer={isBuyer}
            isStaff={isStaff}
            role={role}
          />
        </div>
      </header>
    </TooltipProvider>
  );
}

// ─── Desktop nav ───────────────────────────────────────────────────────────

function DesktopNav({
  session,
  isLoggedIn,
  isBuyer,
  isStaff,
  role,
  variant,
}: {
  session?: Session;
  isLoggedIn: boolean;
  isBuyer: boolean;
  isStaff: boolean;
  role: "broker" | "admin" | "user" | null;
  variant: "full" | "compact";
}) {
  return (
    <nav className="hidden sm:flex items-center gap-2">
      {/* Primary action: browse listings */}
      <Button
        asChild
        variant={variant === "full" && !isLoggedIn ? "ghost" : "ghost"}
        size="sm"
      >
        <Link href="/search">
          <Search className="h-4 w-4 mr-1.5" aria-hidden />
          Browse listings
        </Link>
      </Button>

      {/* Buyer quick-access icon buttons */}
      {isBuyer && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="sm" aria-label="Saved listings">
                <Link href="/saved">
                  <Heart className="h-4 w-4" aria-hidden />
                  <span className="hidden lg:inline ml-1.5">Saved</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="lg:hidden">
              Saved listings
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="sm" aria-label="Compare listings">
                <Link href="/compare">
                  <GitCompareArrows className="h-4 w-4" aria-hidden />
                  <span className="hidden lg:inline ml-1.5">Compare</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="lg:hidden">
              Compare
            </TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Staff: a single Dashboard / Admin primary button */}
      {isStaff && (
        <Button asChild size="sm" className="ml-1">
          <Link href={role === "admin" ? "/admin" : "/dashboard"}>
            {role === "admin" ? (
              <ShieldCheck className="h-4 w-4 mr-1.5" aria-hidden />
            ) : (
              <LayoutDashboard className="h-4 w-4 mr-1.5" aria-hidden />
            )}
            {role === "admin" ? "Admin" : "Dashboard"}
          </Link>
        </Button>
      )}

      {/* Logged-out CTAs */}
      {!isLoggedIn && (
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="shadow-sm shadow-primary/20">
            <Link href="/auth/register">
              {variant === "full" ? "Register agency" : "Create account"}
            </Link>
          </Button>
          <ThemeSwitcher />
        </>
      )}

      {/* Logged-in user menu */}
      {isLoggedIn && session?.user?.email && (
        <div className="ml-1 pl-2 border-l border-border/60">
          <UserMenu
            user={{
              name: session.user.name ?? null,
              email: session.user.email,
              role: role!,
            }}
          />
        </div>
      )}
    </nav>
  );
}

// ─── Mobile nav (Sheet) ────────────────────────────────────────────────────

function MobileNav({
  session,
  isLoggedIn,
  isBuyer,
  isStaff,
  role,
}: {
  session?: Session;
  isLoggedIn: boolean;
  isBuyer: boolean;
  isStaff: boolean;
  role: "broker" | "admin" | "user" | null;
}) {
  const displayName =
    session?.user?.name?.toString().trim() ||
    session?.user?.email?.toString().split("@")[0] ||
    "Account";
  const email = session?.user?.email?.toString() ?? "";

  return (
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

            {/* User identity block (logged in only) */}
            {isLoggedIn && (
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold"
                    aria-hidden
                  >
                    {(displayName.charAt(0) || "?").toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
              {/* Always visible */}
              <MobileNavLink href="/search" icon={<Search className="h-4 w-4" />}>
                Browse listings
              </MobileNavLink>

              {/* Buyer items */}
              {isBuyer && (
                <>
                  <MobileSection label="Your account" />
                  <MobileNavLink
                    href="/account"
                    icon={<UserIcon className="h-4 w-4" />}
                  >
                    Your account
                  </MobileNavLink>
                  <MobileNavLink
                    href="/saved"
                    icon={<Heart className="h-4 w-4" />}
                  >
                    Saved listings
                  </MobileNavLink>
                  <MobileNavLink
                    href="/compare"
                    icon={<GitCompareArrows className="h-4 w-4" />}
                  >
                    Compare
                  </MobileNavLink>
                </>
              )}

              {/* Staff items */}
              {isStaff && (
                <>
                  <MobileSection label="Workspace" />
                  <MobileNavLink
                    href={role === "admin" ? "/admin" : "/dashboard"}
                    icon={
                      role === "admin" ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <LayoutDashboard className="h-4 w-4" />
                      )
                    }
                  >
                    {role === "admin" ? "Admin panel" : "Dashboard"}
                  </MobileNavLink>
                  {role === "broker" && (
                    <MobileNavLink
                      href="/dashboard/listings"
                      icon={<Building2 className="h-4 w-4" />}
                    >
                      Listings
                    </MobileNavLink>
                  )}
                </>
              )}

              {/* Logged-out items */}
              {!isLoggedIn && (
                <>
                  <MobileSection label="Get started" />
                  <MobileNavLink href="/auth/login">Sign in</MobileNavLink>
                  <Link
                    href="/auth/register"
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-primary hover:bg-primary/8 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Create account
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Link>
                </>
              )}
            </nav>

            <div className="px-4 pt-2 pb-1 flex items-center gap-4 text-xs text-muted-foreground">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Terms
              </Link>
            </div>

            <div className="p-4 border-t border-border space-y-3">
              {isLoggedIn && session?.user?.email && (
                <div className="flex justify-center">
                  <UserMenu
                    user={{
                      name: session.user.name ?? null,
                      email: session.user.email,
                      role: role!,
                    }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Australia&apos;s trusted business marketplace
                </p>
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {icon && (
        <span className="text-muted-foreground" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}

function MobileSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
  );
}
