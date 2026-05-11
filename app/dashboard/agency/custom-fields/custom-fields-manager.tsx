"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  GripVertical,
  Tags,
} from "lucide-react";
// Loader2 is referenced inside the FieldDialog below.
import {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  reorderCustomFields,
  type CrmCustomField,
  type CustomFieldType,
  type CustomFieldOption,
} from "@/lib/actions/crm-custom-fields";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  boolean: "Yes / No",
  select: "Dropdown",
  date: "Date",
};

type Props = {
  initialFields: CrmCustomField[];
  canManage: boolean;
  ownership: "agency" | "broker";
};

export function CustomFieldsManager({
  initialFields,
  canManage,
  ownership,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CrmCustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmCustomField | null>(null);
  const [, startTransition] = useTransition();

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteCustomField(deleteTarget.id);
    if (res.ok) {
      setFields((fs) => fs.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Field removed");
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error);
    }
  };

  const handleMove = async (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    const reordered = [...fields];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setFields(reordered);
    const res = await reorderCustomFields(reordered.map((f) => f.id));
    if (!res.ok) {
      toast.error(res.error);
      setFields(fields); // rollback
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base flex items-center gap-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              {ownership === "agency"
                ? "Agency-wide custom fields"
                : "Your custom fields"}
            </CardTitle>
            <CardDescription>
              {fields.length === 0
                ? "No custom fields yet. Add columns like “Hot lead”, “Finance approved”, “Priority”."
                : `${fields.length} field${fields.length === 1 ? "" : "s"} defined.`}
            </CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add field
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 ? (
            <div className="py-12 px-6 text-center text-sm text-muted-foreground">
              {canManage ? (
                <>Click “Add field” to define your first column.</>
              ) : (
                <>Your agency owner hasn’t added any custom CRM fields yet.</>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {fields.map((f, i) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-6"
                >
                  {canManage && (
                    <div className="flex flex-col -space-y-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(f.id, -1)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <GripVertical className="h-3 w-3 rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(f.id, 1)}
                        disabled={i === fields.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <GripVertical className="h-3 w-3 -rotate-90" />
                      </button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{f.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {FIELD_TYPE_LABELS[f.field_type]}
                      </Badge>
                      <code className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {f.key}
                      </code>
                    </div>
                    {f.field_type === "select" && f.options && f.options.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {f.options.map((o) => (
                          <Badge
                            key={o.value}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {o.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditTarget(f)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(f)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FieldDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add custom field"
        submitLabel="Add field"
        onSubmit={async (form) => {
          const res = await createCustomField(form);
          if (!res.ok) return res.error;
          setFields((fs) => [...fs, res.field]);
          startTransition(() => router.refresh());
          return null;
        }}
      />

      <FieldDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        title="Edit custom field"
        submitLabel="Save changes"
        initial={
          editTarget
            ? {
                label: editTarget.label,
                fieldType: editTarget.field_type,
                options: editTarget.options ?? [],
              }
            : undefined
        }
        editing
        onSubmit={async (form) => {
          if (!editTarget) return "Missing field";
          const res = await updateCustomField(editTarget.id, {
            label: form.label,
            options:
              form.fieldType === "select" ? form.options ?? [] : null,
          });
          if (!res.ok) return res.error;
          setFields((fs) =>
            fs.map((f) =>
              f.id === editTarget.id
                ? {
                    ...f,
                    label: form.label,
                    options:
                      form.fieldType === "select" ? form.options ?? [] : null,
                  }
                : f,
            ),
          );
          setEditTarget(null);
          startTransition(() => router.refresh());
          return null;
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleteTarget?.label}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All values stored against this field will be removed for every
              contact. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

// ─── Add / Edit field dialog ──────────────────────────────────────────────

type FieldFormState = {
  label: string;
  fieldType: CustomFieldType;
  options: CustomFieldOption[];
};

const EMPTY_FORM: FieldFormState = {
  label: "",
  fieldType: "text",
  options: [],
};

function FieldDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: FieldFormState;
  editing?: boolean;
  onSubmit: (form: FieldFormState) => Promise<string | null>;
}) {
  const [form, setForm] = useState<FieldFormState>(initial ?? EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-sync form when `initial` changes (different edit target).
  const initialKey = `${initial?.label ?? ""}-${initial?.fieldType ?? ""}-${initial?.options?.length ?? 0}`;
  const [lastKey, setLastKey] = useState(initialKey);
  if (open && lastKey !== initialKey) {
    setForm(initial ?? EMPTY_FORM);
    setError(null);
    setLastKey(initialKey);
  }

  const handleSubmit = async () => {
    setError(null);
    if (!form.label.trim()) {
      setError("Label is required");
      return;
    }
    if (form.fieldType === "select" && form.options.length === 0) {
      setError("Select fields need at least one option");
      return;
    }
    setSubmitting(true);
    const err = await onSubmit(form);
    setSubmitting(false);
    if (err) setError(err);
    else if (!editing) setForm(EMPTY_FORM);
  };

  const addOption = () => {
    setForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { value: `opt_${nanoid(4)}`, label: "" },
      ],
    }));
  };
  const updateOption = (idx: number, patch: Partial<CustomFieldOption>) => {
    setForm((f) => {
      const next = [...f.options];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, options: next };
    });
  };
  const removeOption = (idx: number) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Field type can't be changed after creation."
              : "Pick a label and a type. The key is generated automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">Label *</Label>
            <Input
              id="cf-label"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="Hot lead"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-type">Type</Label>
            <Select
              value={form.fieldType}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  fieldType: v as CustomFieldType,
                  options: v === "select" ? f.options : [],
                }))
              }
              disabled={editing}
            >
              <SelectTrigger id="cf-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["text", "number", "boolean", "select", "date"] as CustomFieldType[]
                ).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.fieldType === "select" && (
            <div className="space-y-2">
              <Label className="text-xs">Options</Label>
              {form.options.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No options yet — add at least one.
                </p>
              )}
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(i, { label: e.target.value })}
                    placeholder={`Option ${i + 1}`}
                    className="text-sm h-8"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeOption(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addOption}>
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
