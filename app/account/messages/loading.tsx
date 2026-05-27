import { PublicHeaderSkeleton } from "@/components/public-header-skeleton";
import { MessagesShellSkeleton } from "@/components/messaging/messages-shell-skeleton";

export default function MessagesLoading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <PublicHeaderSkeleton maxWidth="max-w-none" />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MessagesShellSkeleton containerClassName="flex-1 min-h-0 rounded-none border-0 border-t shadow-none" />
      </main>
    </div>
  );
}
