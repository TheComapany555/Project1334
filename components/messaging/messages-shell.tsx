"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThreadList } from "./thread-list";
import { ConversationPane } from "./conversation-pane";
import {
  listBrokerThreads,
  listBuyerThreads,
  type MessageRole,
  type ThreadSummary,
} from "@/lib/actions/messages";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

const POLL_INTERVAL_MS = 15_000;

type Props = {
  viewerRole: MessageRole;
  initialThreads: ThreadSummary[];
};

export function MessagesShell({ viewerRole, initialThreads }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialId = searchParams.get("thread");
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  const queryKey = viewerRole === "broker" ? ["broker-threads"] : ["buyer-threads"];
  const threadsQuery = useQuery({
    queryKey,
    queryFn: () =>
      viewerRole === "broker" ? listBrokerThreads({}) : listBuyerThreads(),
    initialData: initialThreads,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const threads = threadsQuery.data ?? [];

  // If the URL pointed at a thread the broker doesn't own (or it disappeared),
  // fall back to the first thread.
  useEffect(() => {
    if (!selectedId) return;
    if (threads.length === 0) return;
    if (!threads.find((t) => t.id === selectedId)) {
      setSelectedId(null);
    }
  }, [threads, selectedId]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  const handleSelect = (t: ThreadSummary) => {
    setSelectedId(t.id);
    // Reflect in URL so deep links + browser back work.
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    sp.set("thread", t.id);
    router.replace(`?${sp.toString()}`, { scroll: false });
    // Clear the thread's unread count optimistically — markThreadRead in the
    // pane will confirm.
    queryClient.setQueryData<ThreadSummary[]>(queryKey, (prev) =>
      (prev ?? []).map((x) =>
        x.id === t.id ? { ...x, unread_count: 0 } : x,
      ),
    );
  };

  const handleBack = () => {
    setSelectedId(null);
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    sp.delete("thread");
    router.replace(sp.toString() ? `?${sp.toString()}` : "?", { scroll: false });
  };

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-1 md:grid-cols-[300px_1fr] rounded-md border overflow-hidden">
      <div className={cn(selected ? "hidden md:flex md:flex-col" : "flex flex-col")}>
        <ThreadList
          threads={threads}
          isLoading={threadsQuery.isLoading && threads.length === 0}
          selectedThreadId={selectedId}
          onSelect={handleSelect}
          viewerRole={viewerRole}
        />
      </div>
      <div className={cn(selected ? "flex flex-col" : "hidden md:flex md:flex-col")}>
        {selected ? (
          <ConversationPane
            thread={selected}
            viewerRole={viewerRole}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Pick a conversation to read or reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
