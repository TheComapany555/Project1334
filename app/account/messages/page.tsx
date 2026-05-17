import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { listBuyerThreads } from "@/lib/actions/messages";
import { PublicHeader } from "@/components/public-header";
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
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <PublicHeader session={session} maxWidth="max-w-none" />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense fallback={null}>
          <MessagesShell
            viewerRole="buyer"
            initialThreads={threads}
            containerClassName="flex-1 min-h-0 rounded-none border-0 border-t shadow-none"
          />
        </Suspense>
      </main>
    </div>
  );
}
