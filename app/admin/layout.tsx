import { getSession } from "@/lib/auth-client";
import { getProfileNavInfo } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DashboardLoader } from "@/components/dashboard/dashboard-loader";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/auth/login?callbackUrl=/admin");
  }

  const navInfo = await getProfileNavInfo(session.user.id);
  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role as "broker" | "admin",
    photoUrl: navInfo.photo_url ?? undefined,
  };

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
        <AdminSidebar user={user} />
        <SidebarInset>
          <SiteHeader user={user} />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardLoader>
  );
}
