"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createCategory,
  updateCategory,
  type CategoryForAdmin,
} from "@/lib/actions/admin-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Props = { initialCategories: CategoryForAdmin[] };

export function CategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const categories = initialCategories;
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editing, setEditing] = useState<CategoryForAdmin | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createCategory(formData);
    setAddSubmitting(false);
    if (result.ok) {
      toast.success("Category added.");
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to add.");
    }
  }

  async function handleToggleActive(cat: CategoryForAdmin) {
    const result = await updateCategory(cat.id, { active: !cat.active });
    if (result.ok) {
      toast.success(cat.active ? "Category deactivated." : "Category activated.");
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
    const result = await updateCategory(editing.id, {
      name: (formData.get("name") as string)?.trim(),
      slug: (formData.get("slug") as string)?.trim(),
      active: formData.get("active") === "on",
      sort_order: parseInt((formData.get("sort_order") as string) ?? "0", 10) || 0,
    });
    setEditSubmitting(false);
    if (result.ok) {
      toast.success("Category updated.");
      setEditing(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name</Label>
            <Input id="add-name" name="name" required placeholder="Category name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-sort">Sort order</Label>
            <Input id="add-sort" name="sort_order" type="number" defaultValue={0} className="w-24" />
          </div>
          <Button type="submit" disabled={addSubmitting}>
            {addSubmitting ? "Adding…" : "Add category"}
          </Button>
        </form>
        <p className="py-8 text-center text-sm text-muted-foreground">No categories yet. Add one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4 pb-4 border-b">
        <div className="space-y-2">
          <Label htmlFor="add-name">Name</Label>
          <Input id="add-name" name="name" required placeholder="Category name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-sort">Sort order</Label>
          <Input id="add-sort" name="sort_order" type="number" defaultValue={0} className="w-24" />
        </div>
        <Button type="submit" disabled={addSubmitting}>
          {addSubmitting ? "Adding…" : "Add category"}
        </Button>
      </form>

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
          {categories.map((cat) => (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{cat.slug}</TableCell>
              <TableCell>{cat.sort_order}</TableCell>
              <TableCell>
                <Badge variant={cat.active ? "default" : "secondary"}>
                  {cat.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleToggleActive(cat)}>
                    {cat.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(cat)}>
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="sm:max-w-md">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle>Edit category</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 px-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    required
                    defaultValue={editing.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-slug">Slug</Label>
                  <Input
                    id="edit-slug"
                    name="slug"
                    required
                    defaultValue={editing.slug}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sort">Sort order</Label>
                  <Input
                    id="edit-sort"
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
