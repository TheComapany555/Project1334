import { Badge } from "@/components/ui/badge";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/lib/types/support";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

const STATUS_VARIANT: Record<SupportTicketStatus, BadgeVariant> = {
  open: "default",
  in_progress: "warning",
  awaiting_reply: "secondary",
  resolved: "success",
  closed: "outline",
};

const PRIORITY_VARIANT: Record<SupportTicketPriority, BadgeVariant> = {
  low: "outline",
  normal: "secondary",
  high: "warning",
  urgent: "destructive",
};

export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize border-0">
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TicketPriorityBadge({
  priority,
}: {
  priority: SupportTicketPriority;
}) {
  // "Normal" is the implicit default — keep it quiet to reduce noise.
  if (priority === "normal") return null;
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className="capitalize">
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
