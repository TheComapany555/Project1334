"use client";

import { useState, useTransition } from "react";
import { Trash2, Tag as TagIcon, Plus, Check, Pencil, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TAG_COLOR_CLASSES,
  TAG_COLOR_OPTIONS,
  type ContactTag,
  type TagColor,
} from "@/lib/types/contacts";
import {
  createContactTag,
  deleteContactTag,
  updateContactTag,
} from "@/lib/actions/contact-tags";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: ContactTag[];
  onTagsChanged: (tags: ContactTag[]) => void;
};

export function ContactTagManager({ open, onOpenChange, tags, onTagsChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("primary");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContactTag | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    setError(null);
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createContactTag(newName, newColor);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onTagsChanged([...tags, res.tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewColor("primary");
    });
  };

  const startEdit = (tag: ContactTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const submitEdit = (tag: ContactTag) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === tag.name) {
      cancelEdit();
      return;
    }
    setBusyId(tag.id);
    startTransition(async () => {
      const res = await updateContactTag(tag.id, { name: trimmed });
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onTagsChanged(
        tags
          .map((t) => (t.id === tag.id ? res.tag : t))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
    });
  };

  const handleRecolor = (tag: ContactTag, color: TagColor) => {
    setBusyId(tag.id);
    startTransition(async () => {
      const res = await updateContactTag(tag.id, { color });
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onTagsChanged(tags.map((t) => (t.id === tag.id ? res.tag : t)));
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const tag = deleteTarget;
    setBusyId(tag.id);
    startTransition(async () => {
      const res = await deleteContactTag(tag.id);
      setBusyId(null);
      setDeleteTarget(null);
      if (!res.ok) {
        setError(res.error ?? "Failed to delete tag");
        return;
      }
      onTagsChanged(tags.filter((t) => t.id !== tag.id));
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Manage Tags
            </DialogTitle>
            <DialogDescription>
              Create and edit tags to categorize your contacts (for example VIP
              or Investor).
            </DialogDescription>
          </DialogHeader>

          {/* Create new tag */}
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Create new tag
            </p>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tag name"
                className="h-8 text-sm"
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) handleCreate();
                }}
              />
              <Select value={newColor} onValueChange={(v) => setNewColor(v as TagColor)}>
                <SelectTrigger size="sm" className="w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || pending}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing tags */}
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {tags.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center">
                <p className="text-sm text-muted-foreground">No tags yet.</p>
              </div>
            ) : (
              tags.map((tag) => {
                const isEditing = editingId === tag.id;
                const isBusy = busyId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitEdit(tag);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm flex-1"
                        disabled={isBusy}
                      />
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[11px]",
                          TAG_COLOR_CLASSES[tag.color]
                        )}
                      >
                        {tag.name}
                      </Badge>
                    )}

                    {!isEditing && <div className="flex-1" />}

                    <Select
                      value={tag.color}
                      onValueChange={(v) => handleRecolor(tag, v as TagColor)}
                      disabled={isBusy || isEditing}
                    >
                      <SelectTrigger size="sm" className="w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAG_COLOR_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {isEditing ? (
                      <>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => submitEdit(tag)}
                          disabled={isBusy}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={isBusy}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => startEdit(tag)}
                          disabled={isBusy}
                          aria-label="Rename tag"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tag)}
                          disabled={isBusy}
                          aria-label="Delete tag"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              The tag{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              will be removed from all contacts that have it. The contacts
              themselves will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
