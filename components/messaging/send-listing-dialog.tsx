"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getListingsByBroker } from "@/lib/actions/listings";
import { sendListingInThread } from "@/lib/actions/messages";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  threadId: string;
  onSent?: () => void;
};

export function SendListingDialog({ open, onOpenChange, threadId, onSent }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [isSending, startSend] = useTransition();

  const listingsQuery = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => getListingsByBroker(),
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(null);
    }
  }, [open]);

  const published = useMemo(() => {
    const all = listingsQuery.data ?? [];
    let list = all.filter((l) => l.status === "published");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.location_text ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [listingsQuery.data, search]);

  const handleSend = () => {
    if (!selected) return;
    startSend(async () => {
      const res = await sendListingInThread(threadId, selected);
      if (res.ok) {
        toast.success("Listing sent");
        onOpenChange(false);
        onSent?.();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a listing</DialogTitle>
          <DialogDescription>
            Pick one of your published listings — the buyer gets the title,
            price, and a link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your listings"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border">
            {listingsQuery.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : published.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No published listings match.
              </div>
            ) : (
              <ul className="divide-y">
                {published.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition flex items-start gap-3",
                        selected === l.id && "bg-muted",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {l.location_text ?? `${l.suburb ?? ""} ${l.state ?? ""}`}
                        </p>
                      </div>
                      {selected === l.id && (
                        <Badge variant="default" className="text-[10px] shrink-0">
                          Selected
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!selected || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send to buyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
