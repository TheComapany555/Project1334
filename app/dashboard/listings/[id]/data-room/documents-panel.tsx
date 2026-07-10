"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatFileSize } from "@/lib/utils";
import {
  approveListingDocument,
  deleteListingDocument,
  rejectListingDocument,
  resetDocumentApproval,
} from "@/lib/actions/documents";
import {
  createFolder,
  deleteFolder,
  ensureDefaultFoldersForListing,
  getListingFolderTree,
  moveDocuments,
  renameFolder,
  updateDocument,
  uploadListingDocumentToFolder,
} from "@/lib/actions/data-room";
import {
  DOCUMENT_APPROVAL_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type ListingDocument,
} from "@/lib/types/documents";
import type {
  DocumentFolder,
  FolderTreeNode,
} from "@/lib/types/data-room";
import {
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Folder,
  FolderInput,
  FolderPlus,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { DocumentPreviewModal } from "@/components/listings/document-preview-modal";
import { FileTreeTable } from "@/components/data-room/file-tree-table";
import { SelectionToolbar } from "@/components/data-room/selection-toolbar";

type Props = {
  listingId: string;
};

type FlatFolder = {
  id: string;
  parent_folder_id: string | null;
  name: string;
  depth: number;
  path: string;
};

export function DocumentsPanel({ listingId }: Props) {
  const [tree, setTree] = useState<FolderTreeNode | null>(null);
  const [foldersFlat, setFoldersFlat] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<ListingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [editFolder, setEditFolder] = useState<DocumentFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DocumentFolder | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<ListingDocument | null>(null);
  const [renameDoc, setRenameDoc] = useState<ListingDocument | null>(null);
  const [renameDocName, setRenameDocName] = useState("");
  const [renameDocDescription, setRenameDocDescription] = useState("");
  const [rejectDoc, setRejectDoc] = useState<ListingDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ListingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const didInitExpand = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getListingFolderTree(listingId);
    setTree(result.root);
    setFoldersFlat(result.foldersFlat);
    setDocuments(result.documents);
    // Drop selections that no longer point at an existing document.
    setSelectedIds((prev) => {
      const valid = new Set(result.documents.map((d) => d.id));
      return new Set([...prev].filter((id) => valid.has(id)));
    });
    // Start with every folder expanded on first load.
    if (!didInitExpand.current && result.foldersFlat.length > 0) {
      didInitExpand.current = true;
      setExpandedIds(new Set(result.foldersFlat.map((f) => f.id)));
    }
    setLoading(false);
  }, [listingId]);

  useEffect(() => {
    (async () => {
      // First open: seed the default folders if the listing has none yet.
      const { foldersFlat: existing } = await getListingFolderTree(listingId);
      if (existing.length === 0) {
        await ensureDefaultFoldersForListing(listingId);
      }
      await refresh();
    })();
  }, [listingId, refresh]);

  const flatFolders = useMemo<FlatFolder[]>(() => {
    if (!tree) return [];
    const out: FlatFolder[] = [];
    const walk = (node: FolderTreeNode, depth: number, pathParts: string[]) => {
      for (const child of node.children) {
        const newPath = [...pathParts, child.name];
        out.push({
          id: child.id,
          parent_folder_id: child.parent_folder_id,
          name: child.name,
          depth,
          path: newPath.join(" / "),
        });
        walk(child, depth + 1, newPath);
      }
    };
    walk(tree, 0, []);
    return out;
  }, [tree]);

  const newFolderParentName = useMemo(() => {
    if (!newFolderParentId) return "Root";
    return (
      flatFolders.find((f) => f.id === newFolderParentId)?.path ?? "Folder"
    );
  }, [flatFolders, newFolderParentId]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateFolder(parentId: string | null) {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setCreatingFolder(true);
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const res = await createFolder({
      listingId,
      parentFolderId: newFolderParentId,
      name,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Folder created.");
    setCreatingFolder(false);
    setNewFolderName("");
    if (newFolderParentId) {
      const parentId = newFolderParentId;
      setExpandedIds((prev) => new Set(prev).add(parentId));
    }
    await refresh();
  }

  async function handleRenameFolder() {
    if (!editFolder) return;
    const res = await renameFolder({
      folderId: editFolder.id,
      name: editFolderName,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Folder renamed.");
    setEditFolder(null);
    await refresh();
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    const res = await deleteFolder(deleteFolderTarget.id);
    if (!res.ok) {
      toast.error(res.error);
      setDeleteFolderTarget(null);
      return;
    }
    toast.success("Folder deleted.");
    setDeleteFolderTarget(null);
    await refresh();
  }

  async function handleMoveDoc(docId: string, targetFolderId: string | null) {
    const res = await moveDocuments({
      documentIds: [docId],
      folderId: targetFolderId,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Document moved.");
    await refresh();
  }

  async function handleBulkMove(targetFolderId: string | null) {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkWorking) return;
    setBulkWorking(true);
    const res = await moveDocuments({
      documentIds: ids,
      folderId: targetFolderId,
    });
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success(`Moved ${ids.length} document${ids.length === 1 ? "" : "s"}.`);
      setSelectedIds(new Set());
      await refresh();
    }
    setBulkWorking(false);
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    setBulkDeleteOpen(false);
    if (ids.length === 0 || bulkWorking) return;
    setBulkWorking(true);
    const toastId = toast.loading(`Deleting 1 of ${ids.length}…`);
    let failed = 0;
    for (const [index, id] of ids.entries()) {
      toast.loading(`Deleting ${index + 1} of ${ids.length}…`, { id: toastId });
      const res = await deleteListingDocument(listingId, id);
      if (!res.ok) failed += 1;
    }
    if (failed > 0) {
      toast.error(
        `Deleted ${ids.length - failed} of ${ids.length} documents. ${failed} failed.`,
        { id: toastId },
      );
    } else {
      toast.success(
        `Deleted ${ids.length} document${ids.length === 1 ? "" : "s"}.`,
        { id: toastId },
      );
    }
    setSelectedIds(new Set());
    setBulkWorking(false);
    await refresh();
  }

  async function handleRenameDoc() {
    if (!renameDoc) return;
    const res = await updateDocument({
      documentId: renameDoc.id,
      name: renameDocName,
      description: renameDocDescription || null,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Document updated.");
    setRenameDoc(null);
    await refresh();
  }

  async function handleDeleteDoc() {
    if (!deleteDocTarget) return;
    const res = await deleteListingDocument(listingId, deleteDocTarget.id);
    if (!res.ok) {
      toast.error(res.error);
      setDeleteDocTarget(null);
      return;
    }
    toast.success("Document deleted.");
    setDeleteDocTarget(null);
    await refresh();
  }

  async function handleApproveDoc(doc: ListingDocument) {
    const res = await approveListingDocument(listingId, doc.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Document approved.");
    await refresh();
  }

  async function handleResetDoc(doc: ListingDocument) {
    const res = await resetDocumentApproval(listingId, doc.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Document set to pending.");
    await refresh();
  }

  async function handleRejectDoc() {
    if (!rejectDoc) return;
    const res = await rejectListingDocument(listingId, rejectDoc.id, rejectReason);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Document rejected.");
    setRejectDoc(null);
    setRejectReason("");
    await refresh();
  }

  async function uploadFiles(
    files: FileList | File[],
    folderId: string | null,
    confidential = true,
  ) {
    const list = Array.from(files);
    if (list.length === 0) return;
    let success = 0;
    const total = list.length;
    const toastId = toast.loading(`Uploading 0/${total} files…`);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      fd.append("category", "other");
      fd.append("is_confidential", confidential ? "true" : "false");
      if (folderId) fd.append("folder_id", folderId);
      const res = await uploadListingDocumentToFolder(listingId, fd);
      if (res.ok) {
        success += 1;
      } else {
        toast.error(`${file.name}: ${res.error}`);
      }
      toast.loading(`Uploading ${i + 1}/${total} files…`, { id: toastId });
    }
    toast.dismiss(toastId);
    if (success > 0) {
      toast.success(
        success === total
          ? `Uploaded ${success} file${success === 1 ? "" : "s"}.`
          : `Uploaded ${success}/${total} files.`,
      );
    }
    await refresh();
  }

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Open the upload dialog pre-filled so the broker picks the destination.
      setDroppedFiles(Array.from(e.dataTransfer.files));
      setUploadOpen(true);
    }
  }

  const headerMeta =
    selectedIds.size > 0 ? (
      <SelectionToolbar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkWorking}
            >
              <FolderInput className="size-4" aria-hidden />
              Move to…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
            <DropdownMenuLabel>Destination</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => handleBulkMove(null)}>
              Root
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {flatFolders.length === 0 ? (
              <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
            ) : (
              flatFolders.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onSelect={() => handleBulkMove(f.id)}
                >
                  <span style={{ paddingLeft: f.depth * 12 }}>{f.name}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setBulkDeleteOpen(true)}
          disabled={bulkWorking}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Button>
      </SelectionToolbar>
    ) : (
      <p className="text-sm text-muted-foreground">
        {foldersFlat.length} {foldersFlat.length === 1 ? "folder" : "folders"} ·{" "}
        {documents.length} {documents.length === 1 ? "file" : "files"}
      </p>
    );

  return (
    <div
      className="space-y-4 relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-primary/10 border-4 border-dashed border-primary pointer-events-none flex items-center justify-center">
          <div className="rounded-lg bg-background px-6 py-4 shadow-lg border border-border">
            <p className="text-lg font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openCreateFolder(null)}
          className="gap-1"
        >
          <FolderPlus className="h-4 w-4" />
          New folder
        </Button>
        <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1">
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      <FileTreeTable
        folders={foldersFlat}
        documents={documents}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        searchQuery={search}
        selectable
        selectedFileIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onFileOpen={setPreviewDoc}
        headerMeta={headerMeta}
        loading={loading}
        modifiedColumnLabel="Modified"
        modifiedField="updated_at"
        renderFileBadges={(d) => (
          <>
            {d.is_confidential && (
              <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                <Lock className="h-2.5 w-2.5" />
                Confidential
              </Badge>
            )}
            <ApprovalBadge status={d.approval_status} />
            {d.category && d.category !== "other" && (
              <span className="hidden shrink-0 text-xs text-muted-foreground lg:inline">
                {DOCUMENT_CATEGORY_LABELS[d.category as DocumentCategory] ??
                  d.category}
              </span>
            )}
          </>
        )}
        renderFileActions={(d) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Preview ${d.name}`}
              onClick={() => setPreviewDoc(d)}
            >
              <Eye className="size-4" aria-hidden />
            </Button>
            <DocRowMenu
              doc={d}
              folders={flatFolders}
              onRename={(doc) => {
                setRenameDoc(doc);
                setRenameDocName(doc.name);
                setRenameDocDescription(doc.description ?? "");
              }}
              onMove={handleMoveDoc}
              onApprove={handleApproveDoc}
              onReject={(doc) => {
                setRejectDoc(doc);
                setRejectReason("");
              }}
              onReset={handleResetDoc}
              onDelete={(doc) => setDeleteDocTarget(doc)}
            />
          </div>
        )}
        renderFolderActions={(folder) => (
          <FolderRowMenu
            folder={folder}
            onNewSubfolder={(f) => openCreateFolder(f.id)}
            onRename={(f) => {
              setEditFolder(f);
              setEditFolderName(f.name);
            }}
            onDelete={(f) => setDeleteFolderTarget(f)}
          />
        )}
        emptyState={
          <p className="text-sm text-muted-foreground">
            {search.trim()
              ? "No documents match your search."
              : "No files here. Drop files anywhere on the page to upload."}
          </p>
        }
      />

      {/* Create folder dialog */}
      <Dialog open={creatingFolder} onOpenChange={setCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder inside{" "}
              <span className="font-medium">{newFolderParentName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-folder-name">Folder name</Label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. 2025 Financials"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateFolder();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent folder</Label>
              <Select
                value={newFolderParentId ?? "__root__"}
                onValueChange={(v) =>
                  setNewFolderParentId(v === "__root__" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">Root</SelectItem>
                  {flatFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatingFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog
        open={!!editFolder}
        onOpenChange={(open) => !open && setEditFolder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-folder-name">Folder name</Label>
            <Input
              id="edit-folder-name"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditFolder(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!editFolderName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation */}
      <AlertDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete folder &ldquo;{deleteFolderTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The folder must be empty. Move any files or subfolders out first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete doc confirmation */}
      <AlertDialog
        open={!!deleteDocTarget}
        onOpenChange={(open) => !open && setDeleteDocTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {deleteDocTarget?.name}
              </span>{" "}
              will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoc}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "document" : "documents"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected documents will be permanently removed. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename/edit document dialog */}
      <Dialog
        open={!!renameDoc}
        onOpenChange={(open) => !open && setRenameDoc(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Name</Label>
              <Input
                id="doc-name"
                value={renameDocName}
                onChange={(e) => setRenameDocName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-description">Description (optional)</Label>
              <Textarea
                id="doc-description"
                value={renameDocDescription}
                onChange={(e) => setRenameDocDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDoc(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameDoc} disabled={!renameDocName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog
        open={!!rejectDoc}
        onOpenChange={(open) => !open && setRejectDoc(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              Hide this document from buyers and add a note for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectDoc}
              disabled={!rejectReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setDroppedFiles(null);
        }}
        folders={flatFolders}
        defaultFolderId={null}
        initialFiles={droppedFiles ?? undefined}
        onUpload={async (files, folderId, confidential) => {
          setUploadOpen(false);
          setDroppedFiles(null);
          await uploadFiles(files, folderId, confidential);
        }}
      />

      <DocumentPreviewModal
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(o) => !o && setPreviewDoc(null)}
        onDownload={(d) => {
          window.open(d.file_url, "_blank", "noopener,noreferrer");
        }}
      />
    </div>
  );
}

function FolderRowMenu({
  folder,
  onNewSubfolder,
  onRename,
  onDelete,
}: {
  folder: DocumentFolder;
  onNewSubfolder: (f: DocumentFolder) => void;
  onRename: (f: DocumentFolder) => void;
  onDelete: (f: DocumentFolder) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${folder.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onNewSubfolder(folder)}>
          <FolderPlus className="h-3.5 w-3.5" />
          New subfolder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRename(folder)}>
          <Edit3 className="h-3.5 w-3.5" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(folder)}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DocRowMenu({
  doc,
  folders,
  onRename,
  onMove,
  onApprove,
  onReject,
  onReset,
  onDelete,
}: {
  doc: ListingDocument;
  folders: FlatFolder[];
  onRename: (d: ListingDocument) => void;
  onMove: (docId: string, folderId: string | null) => void;
  onApprove: (d: ListingDocument) => void;
  onReject: (d: ListingDocument) => void;
  onReset: (d: ListingDocument) => void;
  onDelete: (d: ListingDocument) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${doc.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => onRename(doc)}>
          <Edit3 className="h-3.5 w-3.5" />
          Rename / edit
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Folder className="h-3.5 w-3.5" />
            Move to…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Destination</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onMove(doc.id, null)}>
              Root
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {folders.length === 0 ? (
              <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
            ) : (
              folders.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onSelect={() => onMove(doc.id, f.id)}
                  disabled={f.id === doc.folder_id}
                >
                  <span style={{ paddingLeft: f.depth * 12 }}>{f.name}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        {doc.approval_status !== "approved" && (
          <DropdownMenuItem onSelect={() => onApprove(doc)}>
            <Check className="h-3.5 w-3.5" />
            Approve
          </DropdownMenuItem>
        )}
        {doc.approval_status !== "rejected" && (
          <DropdownMenuItem onSelect={() => onReject(doc)}>
            <X className="h-3.5 w-3.5" />
            Reject
          </DropdownMenuItem>
        )}
        {doc.approval_status !== "pending" && (
          <DropdownMenuItem onSelect={() => onReset(doc)}>
            <RotateCcw className="h-3.5 w-3.5" />
            Set to pending
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(doc)}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ApprovalBadge({ status }: { status: ListingDocument["approval_status"] }) {
  const map = {
    pending: { icon: Clock, color: "text-amber-700 dark:text-amber-400" },
    approved: { icon: CheckCircle2, color: "text-emerald-700 dark:text-emerald-400" },
    rejected: { icon: X, color: "text-red-700 dark:text-red-400" },
  };
  const Cfg = map[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs",
        Cfg.color,
      )}
    >
      <Cfg.icon className="h-3 w-3" />
      {DOCUMENT_APPROVAL_LABELS[status]}
    </span>
  );
}

function UploadDialog({
  open,
  onClose,
  folders,
  defaultFolderId,
  initialFiles,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  folders: FlatFolder[];
  defaultFolderId: string | null;
  initialFiles?: File[];
  onUpload: (
    files: File[],
    folderId: string | null,
    confidential: boolean,
  ) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [confidential, setConfidential] = useState(true);

  useEffect(() => {
    setFolderId(defaultFolderId);
  }, [defaultFolderId]);

  useEffect(() => {
    if (open) setFiles(initialFiles ?? []);
  }, [open, initialFiles]);

  function handleClose() {
    setFiles([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Drop in one or more files. They&apos;ll be queued as pending until
            you approve them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
          />
          {files.length > 0 && (
            <div className="rounded-lg border border-border divide-y divide-border text-xs max-h-40 overflow-y-auto">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="px-3 py-2 flex items-center justify-between"
                >
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-muted-foreground ml-2 shrink-0">
                    {formatFileSize(f.size)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Destination folder</Label>
            <Select
              value={folderId ?? "__root__"}
              onValueChange={(v) => setFolderId(v === "__root__" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Root</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={confidential}
              onCheckedChange={(v) => setConfidential(v === true)}
            />
            <span className="text-sm">
              Mark all as confidential (require NDA + approved data-room access)
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (files.length === 0) return;
              await onUpload(files, folderId, confidential);
              setFiles([]);
            }}
            disabled={files.length === 0}
          >
            Upload {files.length > 0 ? `${files.length} file(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
