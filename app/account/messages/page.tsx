import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth-client";
import { listBuyerThreads } from "@/lib/actions/messages";
import { PublicHeader } from "@/components/public-header";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { MessagesShell } from "@/components/messaging/messages-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages",
  description: "Conversations with brokers about listings.",
};

export default async function BuyerMessagesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/account/messages");
  if (session.user.role === "broker") redirect("/dashboard/messages");
  if (session.user.role === "admin") redirect("/admin");

  const threads = await listBuyerThreads();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader session={session} maxWidth="max-w-7xl" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:py-10 space-y-6">
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Account", href: "/account" },
            { label: "Messages" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversations with brokers about listings you’ve enquired on.
          </p>
        </div>
        <Suspense fallback={null}>
          <MessagesShell viewerRole="buyer" initialThreads={threads} />
        </Suspense>
      </main>
    </div>
  );
}
