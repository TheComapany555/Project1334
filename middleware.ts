import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_GATE_COOKIE,
  isSiteGateEnabled,
  verifySiteAccessToken,
} from "@/lib/site-gate";

const PRODUCTION_HOST = "salebiz.com.au";
const WWW_PRODUCTION_HOST = `www.${PRODUCTION_HOST}`;
const PRODUCTION_HOSTS = new Set([PRODUCTION_HOST, WWW_PRODUCTION_HOST]);

function forwardedProtocol(request: NextRequest): string {
  return request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
}

function canonicalProductionUrl(request: NextRequest): URL | null {
  const host = request.headers.get("host")?.toLowerCase();
  if (!host || !PRODUCTION_HOSTS.has(host)) return null;

  const protocol = forwardedProtocol(request);
  if (host === PRODUCTION_HOST && protocol === "https") return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = PRODUCTION_HOST;
  return url;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const canonicalUrl = canonicalProductionUrl(request);

  // Collapse duplicate production URLs before any gate/auth logic so Google
  // only sees the canonical HTTPS apex domain.
  if (canonicalUrl) {
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // Pre-launch site-wide password gate. Before any auth/role logic, every
  // page request must carry a valid access cookie; otherwise we rewrite to the
  // gate page (URL preserved, so unlocking + reload serves the real page).
  // The gate page itself is exempt to avoid a redirect loop. API routes are
  // never gated here — they have their own auth (NextAuth, Stripe, cron, mobile).
  //
  // Important for SEO: never gate the live production domain. Rewriting a live
  // URL to /site-locked makes crawlers see that URL's noindex metadata, which
  // is exactly what Search Console reports as "Excluded by noindex tag".
  if (
    isSiteGateEnabled() &&
    !PRODUCTION_HOSTS.has(request.headers.get("host")?.toLowerCase() ?? "") &&
    path !== "/site-locked"
  ) {
    const gateToken = request.cookies.get(SITE_GATE_COOKIE)?.value;
    const hasAccess = await verifySiteAccessToken(gateToken);
    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/site-locked";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }

  // Only the dashboard/admin areas need auth/role checks; public pages are
  // done once they've cleared the gate above.
  if (!path.startsWith("/dashboard") && !path.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Dashboard: broker only, verified email required
  if (path.startsWith("/dashboard")) {
    if (!token) {
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(login);
    }
    const role = token.role as string | undefined;
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role !== "broker") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    const emailVerified = token.emailVerified as Date | string | null | undefined;
    if (!emailVerified) {
      return NextResponse.redirect(new URL("/auth/error?error=EmailVerification", request.url));
    }

    // Subscription gating is handled at the layout level (real-time DB check)
    // to avoid stale JWT issues. Middleware only handles auth.

    return NextResponse.next();
  }

  // Admin: admin only
  if (path.startsWith("/admin")) {
    if (!token) {
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(login);
    }
    const role = token.role as string | undefined;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Run on every page so the site gate can cover the whole site. Excludes API
  // routes (own auth), Next internals, and static asset files.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
