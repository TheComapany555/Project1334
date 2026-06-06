"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToTicket } from "@/lib/actions/support";

export function BrokerReplyBox({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSending, startSend] = useTransition();

  function handleSend() {
    const text = body.trim();
    if (!text) {
      toast.error("Message can't be empty.");
      return;
    }
    startSend(async () => {
      const res = await replyToTicket(ticketId, text);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to send your reply.");
      }
    });
  }

  return (
    <div className="grid gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        rows={4}
        maxLength={5000}
        disabled={isSending}
      />
      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={isSending} className="gap-1.5">
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
          Send reply
        </Button>
      </div>
    </div>
  );
}
