import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { LifeBuoy, MessageSquare } from "lucide-react";
import { getMyTickets } from "@/lib/actions/support";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { NewTicketDialog } from "@/components/dashboard/support/new-ticket-dialog";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/ticket-badges";
import { TICKET_CATEGORY_LABELS } from "@/lib/types/support";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const tickets = await getMyTickets();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support"
        description="Raise a ticket with our team and track its progress."
        action={<NewTicketDialog />}
      />

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <LifeBuoy className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1 max-w-xs">
            <p className="font-medium">No tickets yet</p>
            <p className="text-sm text-muted-foreground">
              Need a hand? Open a ticket and our team will get back to you.
            </p>
          </div>
          <NewTicketDialog />
        </div>
      ) : (
        <Card className="divide-y p-0">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/support/${t.id}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-6"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.subject}</span>
                  <TicketPriorityBadge priority={t.priority} />
                </div>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span>#{t.ticket_no}</span>
                  <span aria-hidden>·</span>
                  <span>{TICKET_CATEGORY_LABELS[t.category]}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {t.message_count ?? 0}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {formatDistanceToNow(new Date(t.last_message_at), {
                      addSuffix: true,
                    })}
                  </span>
                </p>
              </div>
              <TicketStatusBadge status={t.status} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
