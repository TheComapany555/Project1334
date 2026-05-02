import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getBuyerAccount } from "@/lib/actions/buyer-account";
import { getBuyerPanelSnapshot } from "@/lib/actions/buyer-panel";
import { getCategories } from "@/lib/actions/listings";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { BuyerAccountView } from "@/components/account/buyer-account-view";
import { BuyerSidePanel } from "@/components/account/buyer-side-panel";

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

  const [account, panel, categories] = await Promise.all([
    getBuyerAccount(),
    getBuyerPanelSnapshot(),
    getCategories(),
  ]);

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-7xl" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:py-10 space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Account" },
          ]}
        />
        {/*
          On mobile: BuyerSidePanel renders ABOVE the account view (`order-first`)
          so the buyer's most actionable content (saved/enquiries/alerts) is reachable
          without scrolling past their profile. On desktop (lg+), it docks to the
          right column and sticks to the viewport while the main content scrolls.
        */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-6">
          <section className="order-2 min-w-0 space-y-6 lg:order-none lg:col-span-8">
            <BuyerAccountView account={account} />
          </section>
          <aside className="order-1 lg:order-none lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
            <BuyerSidePanel snapshot={panel} categories={categoryOptions} />
          </aside>
        </div>
      </main>
    </div>
  );
}
