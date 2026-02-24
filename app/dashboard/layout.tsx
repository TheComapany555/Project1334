import { getSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { BrokerSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "broker") {
    redirect("/auth/login?callbackUrl=/dashboard");
  }
  if (!session.user.emailVerified) {
    redirect("/auth/error?error=EmailVerification");
  }

  return (
    <div className="flex min-h-screen">
      <BrokerSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
