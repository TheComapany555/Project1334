"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  uploadListingDocument,
  deleteListingDocument,
  approveListingDocument,
  rejectListingDocument,
  resetDocumentApproval,
} from "@/lib/actions/documents";
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_APPROVAL_LABELS,
  type DocumentCategory,
  type DocumentApprovalStatus,
  type ListingDocument,
} from "@/lib/types/documents";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  Trash2,
  Lock,
  ArrowLeft,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  RotateCcw,
  Clock,
  MoreHorizontal,
} from "lucide-react";

type Props = {
  listingId: string;
  listingTitle: string;
  initialDocuments: ListingDocument[];
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager({
  listingId,
  listingTitle,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ListingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ListingDocument | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const replaceDoc = (updated: ListingDocument) =>
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const result = await uploadListingDocument(listingId, formData);

    setUploading(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      setDocuments((prev) => [...prev, result.document]);
      setSuccess("Document uploaded. Review and approve to make it visible to buyers.");
      formRef.current?.reset();
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const handleDelete = async (docId: string) => {
    const result = await deleteListingDocument(listingId, docId);
    if (result.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  const handleApprove = async (doc: ListingDocument) => {
    setBusyDocId(doc.id);
    const result = await approveListingDocument(listingId, doc.id);
    setBusyDocId(null);
    if (result.ok) replaceDoc(result.document);
    else setError(result.error);
  };

  const handleReset = async (doc: ListingDocument) => {
    setBusyDocId(doc.id);
    const result = await resetDocumentApproval(listingId, doc.id);
    setBusyDocId(null);
    if (result.ok) replaceDoc(result.document);
    else setError(result.error);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setBusyDocId(rejectTarget.id);
    const result = await rejectListingDocument(listingId, rejectTarget.id, rejectReason);
    setBusyDocId(null);
    if (result.ok) {
      replaceDoc(result.document);
      setRejectTarget(null);
      setRejectReason("");
    } else {
      setError(result.error);
    }
  };

  const pendingCount = documents.filter((d) => d.approval_status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings/${listingId}/edit`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Document Vault</h1>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {listingTitle}
          </p>
        </div>
      </div>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Add documents to this listing. Confidential documents require buyers
            to sign an NDA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            onSubmit={handleUpload}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="doc-name">Document Name</Label>
                <Input
                  id="doc-name"
                  name="name"
                  placeholder="e.g. Profit & Loss 2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-category">Category</Label>
                <Select name="category" defaultValue="other">
                  <SelectTrigger id="doc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_CATEGORY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">File (max 10MB)</Label>
              <Input
                id="doc-file"
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="doc-confidential"
                name="is_confidential"
                value="true"
                defaultChecked
              />
              <Label htmlFor="doc-confidential" className="text-sm">
                Confidential. Requires NDA to access.
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing documents */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documents ({documents.length})
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Buyers only see documents you have approved. Newly uploaded
            documents start as Pending.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No documents uploaded yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 sm:pl-6">Document</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Visibility</TableHead>
                  <TableHead className="hidden lg:table-cell">Size</TableHead>
                  <TableHead className="w-12 pr-4 sm:pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const status = STATUS_BADGE[doc.approval_status];
                  const isBusy = busyDocId === doc.id;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="pl-4 sm:pl-6 py-3 align-top max-w-[280px]">
                        <div className="flex items-start gap-2.5">
                          <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {doc.name}
                            </p>
                            {doc.approval_status === "rejected" &&
                              doc.rejection_reason && (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  Reason: {doc.rejection_reason}
                                </p>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-3 align-top">
                        <Badge variant="outline" className="text-[10px]">
                          {DOCUMENT_CATEGORY_LABELS[
                            doc.category as DocumentCategory
                          ] ?? doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <Badge
                          variant={status.variant}
                          className={cn("text-[10px]", status.className)}
                        >
                          {status.icon}
                          {DOCUMENT_APPROVAL_LABELS[doc.approval_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-3 align-top">
                        {doc.is_confidential ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            Confidential
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Public
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-3 align-top text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="pr-4 sm:pr-6 py-3 align-top text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={isBusy}
                              aria-label="Open document actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {doc.approval_status !== "approved" && (
                              <DropdownMenuItem
                                onSelect={() => handleApprove(doc)}
                                disabled={isBusy}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {doc.approval_status !== "rejected" && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRejectTarget(doc);
                                  setRejectReason("");
                                }}
                                disabled={isBusy}
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </DropdownMenuItem>
                            )}
                            {doc.approval_status !== "pending" && (
                              <DropdownMenuItem
                                onSelect={() => handleReset(doc)}
                                disabled={isBusy}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Set to pending
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleteTarget(doc)}
                              disabled={isBusy}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              from this listing. The file cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) await handleDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject reason dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              The document will be hidden from buyers. Provide a reason for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. outdated figures, replaced by newer version"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={!rejectReason.trim() || busyDocId === rejectTarget?.id}
            >
              Reject document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to NDA setup */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">NDA Configuration</p>
            <p className="text-xs text-muted-foreground">
              Require buyers to sign an NDA before accessing confidential
              documents.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/listings/${listingId}/nda`}>
              Manage NDA
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const STATUS_BADGE: Record<DocumentApprovalStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: React.ReactNode }> = {
  pending: {
    variant: "secondary",
    className: "gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300",
    icon: <Clock className="h-2.5 w-2.5" />,
  },
  approved: {
    variant: "secondary",
    className: "gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: <CheckCircle2 className="h-2.5 w-2.5" />,
  },
  rejected: {
    variant: "secondary",
    className: "gap-1 bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300",
    icon: <X className="h-2.5 w-2.5" />,
  },
};

