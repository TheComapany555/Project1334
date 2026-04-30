import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getBuyerAccount } from "@/lib/actions/buyer-account";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { BuyerAccountView } from "@/components/account/buyer-account-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your buyer profile and preferences.",
};

export default async function AccountPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/account");
  }

  // Brokers/admins use the dashboard profile editor
  if (session.user.role === "broker") redirect("/dashboard/profile");
  if (session.user.role === "admin") redirect("/admin");

  const account = await getBuyerAccount();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-5xl" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10 space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Account" },
          ]}
        />
        <BuyerAccountView account={account} />
      </main>
    </div>
  );
}
