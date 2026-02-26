import { getSession } from "@/lib/auth-client";
import { getProfileNavInfo } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

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
  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role,
    profileSlug: navInfo.slug ?? undefined,
    photoUrl: navInfo.photo_url ?? undefined,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <DashboardHeader user={user} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
