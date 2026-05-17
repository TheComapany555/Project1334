import { Suspense } from "react";
import { listBrokerThreads } from "@/lib/actions/messages";
import { PageHeader } from "@/components/admin/page-header";
import { MessagesShell } from "@/components/messaging/messages-shell";

export const dynamic = "force-dynamic";

export default async function BrokerMessagesPage() {
  const threads = await listBrokerThreads({});

  return (
    <div className="flex min-h-0 flex-col gap-4 h-[calc(100vh-var(--header-height)-7rem)] min-h-[480px]">
      <PageHeader
        title="Messages"
        description="In-platform chat with buyers. Replies are auto-logged to the buyer's CRM timeline."
        className="shrink-0"
      />
      <Suspense fallback={null}>
        <MessagesShell
          viewerRole="broker"
          initialThreads={threads}
          containerClassName="min-h-0 flex-1"
        />
      </Suspense>
    </div>
  );
}
