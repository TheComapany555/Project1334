import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMyTicket } from "@/lib/actions/support";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/ticket-badges";
import { TicketMessages } from "@/components/support/ticket-messages";
import { BrokerReplyBox } from "@/components/dashboard/support/broker-reply-box";
import { TICKET_CATEGORY_LABELS } from "@/lib/types/support";

export const metadata = { title: "Ticket" };

export default async function BrokerTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getMyTicket(id);
  if (!ticket) notFound();

  const closed = ticket.status === "closed";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to support
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {ticket.subject}
            </h1>
            <p className="text-sm text-muted-foreground">
              #{ticket.ticket_no} · {TICKET_CATEGORY_LABELS[ticket.category]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <TicketMessages messages={ticket.messages} viewer="broker" />
      </Card>

      {closed ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          This ticket is closed. If you still need help, please open a new
          ticket.
        </p>
      ) : (
        <>
          <Separator />
          <BrokerReplyBox ticketId={ticket.id} />
        </>
      )}
    </div>
  );
}
