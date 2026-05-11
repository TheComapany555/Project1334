"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Check, ChevronDown, ChevronUp } from "lucide-react";
import { completeFollowUp, type CrmFollowUp } from "@/lib/actions/crm";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";
import { cn } from "@/lib/utils";

/**
 * "Follow-ups due today / overdue" panel at the top of the CRM page.
 * Server component fetches `getFollowUpsDueToday()` and passes the rows here.
 */
export function FollowUpsBanner({
  followUps,
  contactNameById,
}: {
  followUps: CrmFollowUp[];
  contactNameById: Record<string, string | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const openBuyer = useBuyerPanelStore((s) => s.openBuyer);
  const openContact = useBuyerPanelStore((s) => s.openContact);

  if (followUps.length === 0) return null;

  const overdueCount = followUps.filter(
    (f) => new Date(f.due_at).getTime() < Date.now() - 60_000,
  ).length;
  const todayCount = followUps.length - overdueCount;
  const visible = expanded ? followUps : followUps.slice(0, 3);

  const handleComplete = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await completeFollowUp(id);
      setBusyId(null);
      if (res.ok) {
        toast.success("Follow-up completed");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleOpen = (f: CrmFollowUp) => {
    if (f.buyer_user_id) {
      openBuyer(f.buyer_user_id, f.listing_id ?? null);
    } else if (f.contact_id) {
      openContact(f.contact_id);
    }
  };

  return (
    <Card
      className={cn(
        "border",
        overdueCount > 0
          ? "border-orange-300 bg-orange-50/40 dark:border-orange-900/60 dark:bg-orange-950/20"
          : "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20",
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              {overdueCount > 0 ? (
                <>
                  <span className="text-orange-700 dark:text-orange-300">
                    {overdueCount} overdue
                  </span>
                  {todayCount > 0 && <> · {todayCount} due today</>}
                </>
              ) : (
                <>{todayCount} follow-up{todayCount === 1 ? "" : "s"} due today</>
              )}
            </p>
          </div>
          {followUps.length > 3 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Show all (
                  {followUps.length})
                </>
              )}
            </Button>
          )}
        </div>

        <ul className="space-y-1.5">
          {visible.map((f) => {
            const isOverdue = new Date(f.due_at).getTime() < Date.now() - 60_000;
            const buyerName =
              (f.contact_id && contactNameById[f.contact_id]) || "Buyer";
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-md bg-background border px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpen(f)}
                      className="font-medium hover:underline underline-offset-2 truncate"
                    >
                      {buyerName}
                    </button>
                    <span className="text-muted-foreground truncate">
                      · {f.title}
                    </span>
                  </div>
                  {f.notes && (
                    <p className="text-muted-foreground line-clamp-1 mt-0.5">
                      {f.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      isOverdue &&
                        "border-orange-300 text-orange-800 dark:border-orange-900/60 dark:text-orange-300",
                    )}
                  >
                    {fmtRelativeDue(f.due_at)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    disabled={busyId === f.id}
                    onClick={() => handleComplete(f.id)}
                  >
                    <Check className="h-3 w-3" />
                    Done
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function fmtRelativeDue(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = t - Date.now();
  const min = Math.round(diff / 60_000);
  if (min < -60 * 24) return `${Math.round(-min / 60 / 24)}d ago`;
  if (min < -60) return `${Math.round(-min / 60)}h ago`;
  if (min < 0) return `${-min}m ago`;
  if (min < 60) return `in ${min}m`;
  if (min < 60 * 24) return `in ${Math.round(min / 60)}h`;
  return `in ${Math.round(min / 60 / 24)}d`;
}
