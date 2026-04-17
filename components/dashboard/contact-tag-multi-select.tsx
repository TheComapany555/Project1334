"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { createContactTag } from "@/lib/actions/contact-tags";
import {
  TAG_COLOR_CLASSES,
  type ContactTag,
} from "@/lib/types/contacts";
import { cn } from "@/lib/utils";

type Props = {
  allTags: ContactTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onTagCreated?: (tag: ContactTag) => void;
};

export function ContactTagMultiSelect({
  allTags,
  selectedIds,
  onChange,
  onTagCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, search]);

  const exactMatch = useMemo(
    () =>
      allTags.find(
        (t) => t.name.toLowerCase() === search.trim().toLowerCase()
      ),
    [allTags, search]
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name) return;
    setCreateError(null);
    startCreate(async () => {
      const res = await createContactTag(name);
      if (!res.ok) {
        setCreateError(res.error);
        return;
      }
      onTagCreated?.(res.tag);
      onChange([...selectedIds, res.tag.id]);
      setSearch("");
    });
  };

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((t) => (
            <Badge
              key={t.id}
              variant="outline"
              className={cn(
                "gap-1 text-[11px] py-0.5 pl-2 pr-1",
                TAG_COLOR_CLASSES[t.color]
              )}
            >
              {t.name}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className="rounded-sm p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Remove ${t.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-1.5"
          >
            <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {selectedTags.length === 0
                ? "Add tags"
                : `${selectedTags.length} selected. Click to add or remove.`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or create tag"
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && !search.trim() && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No tags yet. Type a name above to create one.
              </p>
            )}
            {filtered.map((tag) => {
              const checked = selectedIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", TAG_COLOR_CLASSES[tag.color])}
                  >
                    {tag.name}
                  </Badge>
                </button>
              );
            })}
            {search.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Create{" "}
                  <span className="font-medium">
                    &quot;{search.trim()}&quot;
                  </span>
                </span>
              </button>
            )}
          </div>
          {createError && (
            <p className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {createError}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
