import { getSession } from "@/lib/auth-client";
import { getProfileNavInfo } from "@/lib/actions/profile";
import { getAgencySubscriptionStatus } from "@/lib/actions/subscriptions";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DashboardLoader } from "@/components/dashboard/dashboard-loader";
import { SubscriptionGate } from "@/components/subscription/subscription-gate";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }
  if (session.user.role === "admin") {
    redirect("/admin");
  }
  if (session.user.role !== "broker") {
    redirect("/403");
  }
  if (!session.user.emailVerified) {
    redirect("/auth/error?error=EmailVerification");
  }

  const navInfo = await getProfileNavInfo(session.user.id);

  let subscriptionStatus: SubscriptionStatus | null = null;
  if (session.user.agencyId) {
    const sub = await getAgencySubscriptionStatus(session.user.agencyId);
    if (sub) {
      subscriptionStatus = sub.status;
      if (sub.status === "past_due" && sub.grace_period_end) {
        if (new Date(sub.grace_period_end) < new Date()) {
          subscriptionStatus = "expired";
        }
      }
    }
  }

  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role as "broker" | "admin",
    profileSlug: navInfo.slug ?? undefined,
    photoUrl: navInfo.photo_url ?? undefined,
    agencyRole: (session.user.agencyRole as "owner" | "member" | null) ?? null,
    agencyName: session.user.agencyName ?? null,
  };

  const isOwner = session.user.agencyRole === "owner";
  const needsSubscription = !!session.user.agencyId;

  return (
    <DashboardLoader>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar user={user} />
        <SidebarInset>
          <SiteHeader user={user} />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                {needsSubscription ? (
                  <SubscriptionGate status={subscriptionStatus} isOwner={isOwner}>
                    {children}
                  </SubscriptionGate>
                ) : (
                  children
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardLoader>
  );
}
