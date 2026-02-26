import { getSession } from "@/lib/auth-client";
import { getProfileNavInfo } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminAppSidebar } from "@/components/dashboard/admin-app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

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
    role: session.user.role,
    photoUrl: navInfo.photo_url ?? undefined,
  };
  return (
    <SidebarProvider>
      <AdminAppSidebar user={user} />
      <SidebarInset>
        <DashboardHeader user={user} />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
