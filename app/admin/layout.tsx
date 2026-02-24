import { getSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/auth/login?callbackUrl=/admin");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
