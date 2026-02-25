import { getSession } from "@/lib/auth-client";
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

  return (
    <SidebarProvider>
      <AdminAppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
