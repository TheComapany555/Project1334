"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
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
import { cn } from "@/lib/utils";
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
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  Folder,
  FolderPlus,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editFolder, setEditFolder] = useState<DocumentFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DocumentFolder | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<ListingDocument | null>(null);
  const [renameDoc, setRenameDoc] = useState<ListingDocument | null>(null);
  const [renameDocName, setRenameDocName] = useState("");
  const [renameDocDescription, setRenameDocDescription] = useState("");
  const [rejectDoc, setRejectDoc] = useState<ListingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition] = useTransition();
  const dragCounter = useRef(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getListingFolderTree(listingId);
    setTree(result.root);
    setFoldersFlat(result.foldersFlat);
    setDocuments(result.documents);
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

  const documentsInCurrentFolder = useMemo(() => {
    const filtered = documents.filter((d) =>
      currentFolderId === null
        ? d.folder_id === null
        : d.folder_id === currentFolderId,
    );
    if (!search.trim()) return filtered;
    const q = search.trim().toLowerCase();
    return filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q),
    );
  }, [documents, currentFolderId, search]);

  // Global search: ignore current folder when search text is present.
  const globalSearchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q),
    );
  }, [documents, search]);

  const subFoldersOfCurrent = useMemo(() => {
    return foldersFlat.filter((f) =>
      currentFolderId === null
        ? f.parent_folder_id === null
        : f.parent_folder_id === currentFolderId,
    );
  }, [foldersFlat, currentFolderId]);

  const currentFolderName = useMemo(() => {
    if (!currentFolderId) return "All documents";
    return foldersFlat.find((f) => f.id === currentFolderId)?.name ?? "Folder";
  }, [foldersFlat, currentFolderId]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const res = await createFolder({
      listingId,
      parentFolderId: currentFolderId,
      name,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Folder created.");
    setCreatingFolder(false);
    setNewFolderName("");
    if (currentFolderId) {
      setExpandedIds((prev) => new Set(prev).add(currentFolderId));
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
    if (currentFolderId === deleteFolderTarget.id) {
      setCurrentFolderId(deleteFolderTarget.parent_folder_id);
    }
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
  async function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startTransition(() => {
        uploadFiles(e.dataTransfer.files, currentFolderId);
      });
    }
  }

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
            <p className="text-lg font-medium">
              Drop files to upload into {currentFolderName}
            </p>
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
          onClick={() => setCreatingFolder(true)}
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

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <div className="rounded-lg border border-border bg-card">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Folders
            </p>
          </div>
          <div className="p-1 max-h-[600px] overflow-y-auto">
            <FolderTreeItem
              label="All documents"
              count={documents.filter((d) => d.folder_id === null).length}
              active={currentFolderId === null}
              depth={0}
              onClick={() => {
                setCurrentFolderId(null);
                setSearch("");
              }}
            />
            {tree?.children.map((node) => (
              <FolderNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                currentFolderId={currentFolderId}
                onToggle={toggleExpand}
                onSelect={(id) => {
                  setCurrentFolderId(id);
                  setSearch("");
                }}
                onRename={(f) => {
                  setEditFolder(f);
                  setEditFolderName(f.name);
                }}
                onDelete={(f) => setDeleteFolderTarget(f)}
                documents={documents}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {search.trim()
                  ? `Search results (${globalSearchResults?.length ?? 0})`
                  : currentFolderName}
              </p>
              {!search.trim() && (
                <p className="text-xs text-muted-foreground">
                  {subFoldersOfCurrent.length} folder(s) ·{" "}
                  {documentsInCurrentFolder.length} file(s)
                </p>
              )}
            </div>
          </div>
          <div>
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : search.trim() ? (
              <DocList
                docs={globalSearchResults ?? []}
                folders={flatFolders}
                showFolderPath
                onApprove={handleApproveDoc}
                onReset={handleResetDoc}
                onReject={(d) => {
                  setRejectDoc(d);
                  setRejectReason("");
                }}
                onRename={(d) => {
                  setRenameDoc(d);
                  setRenameDocName(d.name);
                  setRenameDocDescription(d.description ?? "");
                }}
                onMove={handleMoveDoc}
                onDelete={(d) => setDeleteDocTarget(d)}
              />
            ) : (
              <>
                {subFoldersOfCurrent.length > 0 && (
                  <div className="divide-y divide-border">
                    {subFoldersOfCurrent.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setCurrentFolderId(f.id)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40"
                      >
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <DocList
                  docs={documentsInCurrentFolder}
                  folders={flatFolders}
                  onApprove={handleApproveDoc}
                  onReset={handleResetDoc}
                  onReject={(d) => {
                    setRejectDoc(d);
                    setRejectReason("");
                  }}
                  onRename={(d) => {
                    setRenameDoc(d);
                    setRenameDocName(d.name);
                    setRenameDocDescription(d.description ?? "");
                  }}
                  onMove={handleMoveDoc}
                  onDelete={(d) => setDeleteDocTarget(d)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create folder dialog */}
      <Dialog open={creatingFolder} onOpenChange={setCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder inside{" "}
              <span className="font-medium">{currentFolderName}</span>.
            </DialogDescription>
          </DialogHeader>
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
        onClose={() => setUploadOpen(false)}
        folders={flatFolders}
        defaultFolderId={currentFolderId}
        onUpload={async (files, folderId, confidential) => {
          setUploadOpen(false);
          await uploadFiles(files, folderId, confidential);
        }}
      />
    </div>
  );
}

function FolderTreeItem({
  label,
  count,
  active,
  depth,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  depth: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-sm hover:bg-muted/50",
        active && "bg-primary/10 text-foreground font-medium",
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

function FolderNode({
  node,
  depth,
  expandedIds,
  currentFolderId,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  documents,
}: {
  node: FolderTreeNode;
  depth: number;
  expandedIds: Set<string>;
  currentFolderId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onRename: (f: DocumentFolder) => void;
  onDelete: (f: DocumentFolder) => void;
  documents: ListingDocument[];
}) {
  const expanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const folderDocCount = documents.filter((d) => d.folder_id === node.id).length;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded hover:bg-muted/50",
          currentFolderId === node.id && "bg-primary/10",
        )}
      >
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            "h-6 w-5 shrink-0 flex items-center justify-center",
            !hasChildren && "invisible",
          )}
          style={{ marginLeft: depth * 12 }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={() => onSelect(node.id)}
          className="flex-1 flex items-center gap-1.5 py-1.5 text-left text-sm truncate"
        >
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{node.name}</span>
          {folderDocCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {folderDocCount}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 mr-1"
              aria-label="Folder actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onRename(node)}>
              <Edit3 className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(node)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded &&
        node.children.map((child) => (
          <FolderNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            currentFolderId={currentFolderId}
            onToggle={onToggle}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            documents={documents}
          />
        ))}
    </div>
  );
}

function DocList({
  docs,
  folders,
  showFolderPath,
  onApprove,
  onReset,
  onReject,
  onRename,
  onMove,
  onDelete,
}: {
  docs: ListingDocument[];
  folders: FlatFolder[];
  showFolderPath?: boolean;
  onApprove: (d: ListingDocument) => void;
  onReset: (d: ListingDocument) => void;
  onReject: (d: ListingDocument) => void;
  onRename: (d: ListingDocument) => void;
  onMove: (docId: string, folderId: string | null) => void;
  onDelete: (d: ListingDocument) => void;
}) {
  if (docs.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        No files here. Drop files anywhere on the page to upload.
      </div>
    );
  }
  const folderById = new Map(folders.map((f) => [f.id, f]));
  return (
    <div className="divide-y divide-border">
      {docs.map((d) => (
        <div key={d.id} className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{d.name}</p>
              {d.is_confidential && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  Confidential
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              <ApprovalBadge status={d.approval_status} />
              {d.category && d.category !== "other" && (
                <span>{DOCUMENT_CATEGORY_LABELS[d.category as DocumentCategory] ?? d.category}</span>
              )}
              {d.file_size && <span>{formatFileSize(d.file_size)}</span>}
              {showFolderPath && (
                <span>
                  {d.folder_id
                    ? folderById.get(d.folder_id)?.path ?? "—"
                    : "Root"}
                </span>
              )}
            </div>
            {d.description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {d.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Document actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onRename(d)}>
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
                  <DropdownMenuItem onSelect={() => onMove(d.id, null)}>
                    Root
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {folders.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No folders yet
                    </DropdownMenuItem>
                  ) : (
                    folders.map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        onSelect={() => onMove(d.id, f.id)}
                        disabled={f.id === d.folder_id}
                      >
                        <span style={{ paddingLeft: f.depth * 12 }}>
                          {f.name}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              {d.approval_status !== "approved" && (
                <DropdownMenuItem onSelect={() => onApprove(d)}>
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </DropdownMenuItem>
              )}
              {d.approval_status !== "rejected" && (
                <DropdownMenuItem onSelect={() => onReject(d)}>
                  <X className="h-3.5 w-3.5" />
                  Reject
                </DropdownMenuItem>
              )}
              {d.approval_status !== "pending" && (
                <DropdownMenuItem onSelect={() => onReset(d)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Set to pending
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(d)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
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
    <span className={cn("inline-flex items-center gap-1", Cfg.color)}>
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
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  folders: FlatFolder[];
  defaultFolderId: string | null;
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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
