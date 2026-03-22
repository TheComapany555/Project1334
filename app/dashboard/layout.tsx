import { getSession } from "@/lib/auth-client";
import { getProfileNavInfo } from "@/lib/actions/profile";
import { getAgencySubscriptionStatus } from "@/lib/actions/subscriptions";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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

  // Real-time subscription check (JWT may be stale)
  let subscriptionStatus: SubscriptionStatus | null = null;
  if (session.user.agencyId) {
    const sub = await getAgencySubscriptionStatus(session.user.agencyId);
    if (sub) {
      subscriptionStatus = sub.status;
      // Check grace period expiry for past_due
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
    role: session.user.role,
    profileSlug: navInfo.slug ?? undefined,
    photoUrl: navInfo.photo_url ?? undefined,
    agencyRole: session.user.agencyRole ?? null,
    agencyName: session.user.agencyName ?? null,
  };

  const isOwner = session.user.agencyRole === "owner";
  const needsSubscription = !!session.user.agencyId;

  return (
    <DashboardLoader>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <DashboardHeader user={user} />
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
            {needsSubscription ? (
              <SubscriptionGate
                status={subscriptionStatus}
                isOwner={isOwner}
              >
                {children}
              </SubscriptionGate>
            ) : (
              children
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardLoader>
  );
}
