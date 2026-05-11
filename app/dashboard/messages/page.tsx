import { Suspense } from "react";
import { listBrokerThreads } from "@/lib/actions/messages";
import { PageHeader } from "@/components/admin/page-header";
import { MessagesShell } from "@/components/messaging/messages-shell";

export const dynamic = "force-dynamic";

export default async function BrokerMessagesPage() {
  const threads = await listBrokerThreads({});

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="In-platform chat with buyers. Replies are auto-logged to the buyer's CRM timeline."
      />
      <Suspense fallback={null}>
        <MessagesShell viewerRole="broker" initialThreads={threads} />
      </Suspense>
    </div>
  );
}
