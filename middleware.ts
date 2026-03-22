import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;

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

    // Subscription gating for agency brokers
    const agencyId = token.agencyId as string | null;
    if (agencyId) {
      const subscriptionStatus = token.subscriptionStatus as string | null;
      const isSubscriptionOk = ["active", "trialing", "past_due"].includes(
        subscriptionStatus ?? ""
      );

      // Pages allowed without active subscription
      const allowedPaths = ["/dashboard/subscribe", "/dashboard/profile"];
      const isAllowed = allowedPaths.some(
        (p) => path === p || path.startsWith(p + "/")
      );

      if (!isSubscriptionOk && !isAllowed) {
        return NextResponse.redirect(
          new URL("/dashboard/subscribe", request.url)
        );
      }
    }

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
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
