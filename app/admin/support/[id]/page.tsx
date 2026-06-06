import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminTicket, listAdmins } from "@/lib/actions/support";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/ticket-badges";
import { AdminTicketDetail } from "@/components/admin/support/admin-ticket-detail";
import { TICKET_CATEGORY_LABELS } from "@/lib/types/support";

export const metadata = { title: "Ticket" };

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ticket, admins] = await Promise.all([getAdminTicket(id), listAdmins()]);
  if (!ticket) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/support"
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
              #{ticket.ticket_no} · {TICKET_CATEGORY_LABELS[ticket.category]} ·{" "}
              {ticket.broker?.name ?? "Broker"}
              {ticket.broker?.email ? ` (${ticket.broker.email})` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      <AdminTicketDetail ticket={ticket} admins={admins} />
    </div>
  );
}
