"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  Mail,
  ShieldOff,
  X,
  XCircle,
} from "lucide-react";
import {
  approveDataRoomAccess,
  denyDataRoomAccess,
  revokeDataRoomAccess,
  listListingDataRoomAccess,
  getListingDataRoomCounts,
  type ApproveDataRoomAccessInput,
  type ListingDataRoomCounts,
} from "@/lib/actions/data-room";
import {
  DATA_ROOM_ACCESS_STATUS_LABELS,
  type DataRoomAccessLevel,
  type DataRoomAccessStatus,
  type DataRoomAccessWithBuyer,
} from "@/lib/types/data-room";
import type { ListingDocument } from "@/lib/types/documents";

type Props = {
  listingId: string;
  documents: ListingDocument[];
  accessRows: DataRoomAccessWithBuyer[];
  counts: ListingDataRoomCounts;
  onChange: (
    nextRows: DataRoomAccessWithBuyer[],
    nextCounts: ListingDataRoomCounts,
  ) => void;
};

type StatusFilter = "pending" | "approved" | "all";

const STATUS_BADGE: Record<
  DataRoomAccessStatus,
  { color: string; icon: typeof Clock }
> = {
  pending: {
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    icon: Clock,
  },
  approved: {
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  denied: {
    color: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
    icon: XCircle,
  },
  revoked: {
    color: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    icon: ShieldOff,
  },
  expired: {
    color: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    icon: Clock,
  },
};

export function AccessRequestsPanel({
  listingId,
  documents,
  accessRows,
  counts,
  onChange,
}: Props) {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [approving, setApproving] = useState<DataRoomAccessWithBuyer | null>(
    null,
  );
  const [denying, setDenying] = useState<DataRoomAccessWithBuyer | null>(null);
  const [pending, startTransition] = useTransition();
  const [nowMs] = useState(() => Date.now());

  const filtered = useMemo(() => {
    if (filter === "all") return accessRows;
    return accessRows.filter((r) => r.status === filter);
  }, [accessRows, filter]);

  async function refresh() {
    const [rows, c] = await Promise.all([
      listListingDataRoomAccess(listingId),
      getListingDataRoomCounts(listingId),
    ]);
    onChange(rows, c);
  }

  function handleRevoke(row: DataRoomAccessWithBuyer) {
    if (
      !confirm(`Revoke ${row.buyer.email}'s access to this Virtual Data Room?`)
    ) {
      return;
    }
    startTransition(async () => {
      const res = await revokeDataRoomAccess(row.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Access revoked.");
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {counts.pending > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            Approved
            {counts.approved > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {counts.approved}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {filter === "pending"
              ? "No pending requests. Buyers who sign your NDA will appear here."
              : filter === "approved"
                ? "No approved buyers yet."
                : "No access requests yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>NDA</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <AccessRow
                  key={row.id}
                  row={row}
                  nowMs={nowMs}
                  onApprove={() => setApproving(row)}
                  onDeny={() => setDenying(row)}
                  onRevoke={() => handleRevoke(row)}
                  disabled={pending}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {approving && (
        <ApproveDialog
          row={approving}
          documents={documents}
          onClose={() => setApproving(null)}
          onSaved={async () => {
            setApproving(null);
            await refresh();
          }}
        />
      )}

      {denying && (
        <DenyDialog
          row={denying}
          onClose={() => setDenying(null)}
          onSaved={async () => {
            setDenying(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function AccessRow({
  row,
  nowMs,
  onApprove,
  onDeny,
  onRevoke,
  disabled,
}: {
  row: DataRoomAccessWithBuyer;
  nowMs: number;
  onApprove: () => void;
  onDeny: () => void;
  onRevoke: () => void;
  disabled: boolean;
}) {
  const StatusBadge = STATUS_BADGE[row.status];
  const expiresSoon =
    row.status === "approved" &&
    row.expires_at &&
    new Date(row.expires_at).getTime() - nowMs < 3 * 24 * 60 * 60 * 1000;

  return (
    <TableRow>
      <TableCell>
        <div className="text-sm font-medium">
          {row.buyer.full_name ?? row.buyer.email}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {row.buyer.email}
        </div>
      </TableCell>
      <TableCell>
        {row.nda_signed_at ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <FileSignature className="h-3 w-3" />
            Signed {formatDate(row.nda_signed_at)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not signed</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(row.requested_at)}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[row.status].color}`}
        >
          <StatusBadge.icon className="h-3 w-3" />
          {DATA_ROOM_ACCESS_STATUS_LABELS[row.status]}
        </span>
        {expiresSoon && (
          <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
            Expires {formatDate(row.expires_at!)}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {row.status === "approved" ? (
          <>
            {row.access_level === "all"
              ? "All files"
              : `${row.granted_folder_ids.length} folder(s) · ${row.granted_document_ids.length} file(s)`}
            {!row.download_allowed && (
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                Preview only
              </div>
            )}
          </>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center gap-1 justify-end">
          {row.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={disabled}
                className="gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDeny}
                disabled={disabled}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                Deny
              </Button>
            </>
          )}
          {row.status === "approved" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onApprove}
                disabled={disabled}
              >
                Edit access
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRevoke}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                Revoke
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ApproveDialog({
  row,
  documents,
  onClose,
  onSaved,
}: {
  row: DataRoomAccessWithBuyer;
  documents: ListingDocument[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = row.status === "approved";
  const [accessLevel, setAccessLevel] = useState<DataRoomAccessLevel>(
    isEdit ? row.access_level : "all",
  );
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
    new Set(isEdit ? row.granted_document_ids : []),
  );
  const [downloadAllowed, setDownloadAllowed] = useState(
    isEdit ? row.download_allowed : true,
  );
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    isEdit && row.expires_at ? new Date(row.expires_at) : undefined,
  );
  const [brokerNotes, setBrokerNotes] = useState(row.broker_notes ?? "");
  const [saving, setSaving] = useState(false);

  const approvedDocuments = useMemo(
    () => documents.filter((d) => d.approval_status === "approved"),
    [documents],
  );

  function toggleDoc(docId: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (accessLevel === "selected" && selectedDocs.size === 0) {
      toast.error(
        "Select at least one file, or switch to 'All approved files'.",
      );
      return;
    }
    setSaving(true);
    const input: ApproveDataRoomAccessInput = {
      accessId: row.id,
      accessLevel,
      documentIds: accessLevel === "selected" ? Array.from(selectedDocs) : [],
      folderIds: [],
      downloadAllowed,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      brokerNotes: brokerNotes.trim() || null,
    };
    const res = await approveDataRoomAccess(input);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(isEdit ? "Access updated." : "Access approved.");
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit access" : "Approve access"} for{" "}
            {row.buyer.full_name ?? row.buyer.email}
          </DialogTitle>
          <DialogDescription>
            Choose what this buyer can see in the Virtual Data Room and when
            their access expires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Access level</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                <input
                  type="radio"
                  name="access-level"
                  className="mt-1"
                  checked={accessLevel === "all"}
                  onChange={() => setAccessLevel("all")}
                />
                <div className="text-sm">
                  <div className="font-medium">All approved files</div>
                  <div className="text-xs text-muted-foreground">
                    Buyer sees every approved file in the Virtual Data Room,
                    including files you approve later.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                <input
                  type="radio"
                  name="access-level"
                  className="mt-1"
                  checked={accessLevel === "selected"}
                  onChange={() => setAccessLevel("selected")}
                />
                <div className="text-sm flex-1">
                  <div className="font-medium">Selected files only</div>
                  <div className="text-xs text-muted-foreground">
                    Buyer sees only the files you tick below.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {accessLevel === "selected" && (
            <div className="space-y-2">
              <Label>Files this buyer can see</Label>
              {approvedDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No approved files yet. Approve files in the documents tab
                  first, or use &quot;All approved files&quot; instead.
                </p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border max-h-56 overflow-y-auto">
                  {approvedDocuments.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={selectedDocs.has(doc.id)}
                        onCheckedChange={() => toggleDoc(doc.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{doc.name}</div>
                        {doc.is_confidential && (
                          <div className="text-[10px] text-muted-foreground">
                            Confidential
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expires on (optional)</Label>
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                placeholder="No expiry"
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label>Downloads</Label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer">
                <Checkbox
                  checked={downloadAllowed}
                  onCheckedChange={(checked) =>
                    setDownloadAllowed(checked === true)
                  }
                />
                <span className="text-sm flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Allow downloads
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker-notes">Internal notes (optional)</Label>
            <textarea
              id="broker-notes"
              className="w-full min-h-[80px] rounded-lg border border-border bg-background p-2 text-sm resize-y"
              value={brokerNotes}
              onChange={(e) => setBrokerNotes(e.target.value)}
              placeholder="Anything you want to remember about this buyer..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Approve access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DenyDialog({
  row,
  onClose,
  onSaved,
}: {
  row: DataRoomAccessWithBuyer;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleDeny() {
    if (!reason.trim()) {
      toast.error(
        "Please provide a reason — the buyer won't see it, but it helps you keep track.",
      );
      return;
    }
    setSaving(true);
    const res = await denyDataRoomAccess(row.id, reason.trim());
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Request denied.");
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Deny access for {row.buyer.full_name ?? row.buyer.email}?
          </DialogTitle>
          <DialogDescription>
            The buyer will be notified that their request was declined.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="deny-reason">Reason (internal)</Label>
          <textarea
            id="deny-reason"
            className="w-full min-h-[100px] rounded-lg border border-border bg-background p-2 text-sm resize-y"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Buyer didn't meet minimum budget threshold."
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeny} disabled={saving}>
            {saving ? "Denying..." : "Deny request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
