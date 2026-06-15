"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createSubcategory,
  updateSubcategory,
  type CategoryForAdmin,
  type SubcategoryForAdmin,
} from "@/lib/actions/admin-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

type Props = {
  categories: CategoryForAdmin[];
  subcategories: SubcategoryForAdmin[];
};

export function SubcategoriesManager({ categories, subcategories }: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editing, setEditing] = useState<SubcategoryForAdmin | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const filtered = subcategories
    .filter((s) => s.category_id === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Pick a parent category first.");
      return;
    }
    setAddSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("category_id", categoryId);
    const result = await createSubcategory(formData);
    setAddSubmitting(false);
    if (result.ok) {
      toast.success("Sub-category added.");
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to add.");
    }
  }

  async function handleToggleActive(sub: SubcategoryForAdmin) {
    const result = await updateSubcategory(sub.id, { active: !sub.active });
    if (result.ok) {
      toast.success(sub.active ? "Sub-category deactivated." : "Sub-category activated.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setEditSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await updateSubcategory(editing.id, {
      name: (formData.get("name") as string)?.trim(),
      slug: (formData.get("slug") as string)?.trim(),
      active: formData.get("active") === "on",
      sort_order: parseInt((formData.get("sort_order") as string) ?? "0", 10) || 0,
    });
    setEditSubmitting(false);
    if (result.ok) {
      toast.success("Sub-category updated.");
      setEditing(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
  }

  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Add a category first — sub-categories belong to a parent category.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4 border-b pb-4">
        <div className="space-y-2">
          <Label>Parent category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? " (inactive)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-sub-name">Sub-category name</Label>
          <Input id="add-sub-name" name="name" required placeholder="e.g. Cafe/Coffee Shop" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-sub-sort">Sort order</Label>
          <Input id="add-sub-sort" name="sort_order" type="number" defaultValue={0} className="w-24" />
        </div>
        <Button type="submit" disabled={addSubmitting}>
          {addSubmitting ? "Adding…" : "Add sub-category"}
        </Button>
      </form>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No sub-categories in this category yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{sub.slug}</TableCell>
                <TableCell>{sub.sort_order}</TableCell>
                <TableCell>
                  <Badge variant={sub.active ? "success" : "secondary"} className="border-0">
                    {sub.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(sub)}>
                      {sub.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(sub)}>
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle>Edit sub-category</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 px-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sub-name">Name</Label>
                  <Input id="edit-sub-name" name="name" required defaultValue={editing.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sub-slug">Slug</Label>
                  <Input id="edit-sub-slug" name="slug" required defaultValue={editing.slug} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sub-sort">Sort order</Label>
                  <Input
                    id="edit-sub-sort"
                    name="sort_order"
                    type="number"
                    defaultValue={editing.sort_order}
                    className="w-24"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={editing.active}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Active (visible to brokers)</span>
                </label>
                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editSubmitting}>
                    {editSubmitting ? "Saving…" : "Save"}
                  </Button>
                </SheetFooter>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
