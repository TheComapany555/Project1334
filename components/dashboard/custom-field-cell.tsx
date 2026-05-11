"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  setCustomFieldValue,
  type CrmCustomField,
} from "@/lib/actions/crm-custom-fields";

type Props = {
  field: CrmCustomField;
  contactId: string;
  initialValue: unknown;
  canEdit: boolean;
};

/**
 * Inline cell renderer for a custom CRM field. Click to edit (text/number/date),
 * click toggle (boolean), pick from dropdown (select). Saves on blur / select
 * change / dialog confirm.
 */
export function CustomFieldCell({
  field,
  contactId,
  initialValue,
  canEdit,
}: Props) {
  const [value, setValue] = useState<unknown>(initialValue ?? null);
  const [editing, setEditing] = useState(false);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    setValue(initialValue ?? null);
  }, [initialValue]);

  const persist = (next: unknown) => {
    startSave(async () => {
      const res = await setCustomFieldValue(contactId, field.id, next);
      if (res.ok) {
        setValue(next);
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  // ── Boolean (always inline, no edit mode) ──
  if (field.field_type === "boolean") {
    return (
      <Checkbox
        checked={value === true}
        disabled={!canEdit || saving}
        onCheckedChange={(v) => persist(v === true)}
        aria-label={field.label}
      />
    );
  }

  // ── Select (always inline) ──
  if (field.field_type === "select") {
    const opts = field.options ?? [];
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={(v) => persist(v || null)}
        disabled={!canEdit || saving}
      >
        <SelectTrigger
          size="sm"
          className="h-7 text-[11px] gap-1 px-2 w-auto min-w-[100px]"
        >
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-xs italic">
            (clear)
          </SelectItem>
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // ── Text / number / date — view mode + click-to-edit ──
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => canEdit && setEditing(true)}
        className={cn(
          "text-xs flex items-center gap-1 group max-w-[140px]",
          canEdit && "hover:text-foreground hover:underline underline-offset-2",
        )}
        disabled={!canEdit}
      >
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground italic">Not set</span>
        ) : (
          <span className="truncate">
            {field.field_type === "date"
              ? formatDate(value as string)
              : String(value)}
          </span>
        )}
        {canEdit && (
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 shrink-0" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type={
          field.field_type === "number"
            ? "number"
            : field.field_type === "date"
              ? "date"
              : "text"
        }
        defaultValue={
          value === null || value === undefined ? "" : String(value)
        }
        autoFocus
        disabled={saving}
        className="h-7 text-xs"
        onBlur={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            if (value !== null && value !== "") persist(null);
            else setEditing(false);
            return;
          }
          if (field.field_type === "number") {
            const n = Number(raw);
            if (!Number.isFinite(n)) {
              toast.error("Must be a number");
              return;
            }
            persist(n);
          } else {
            persist(raw);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          } else if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Compact cell shown in `read-only` table cells — no edit affordance. */
export function CustomFieldDisplay({
  field,
  value,
}: {
  field: CrmCustomField;
  value: unknown;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-xs text-muted-foreground italic">—</span>;
  }
  if (field.field_type === "boolean") {
    return value === true ? (
      <Check className="h-3.5 w-3.5 text-emerald-600" />
    ) : (
      <span className="text-xs text-muted-foreground">No</span>
    );
  }
  if (field.field_type === "select") {
    const opts = field.options ?? [];
    const opt = opts.find((o) => o.value === value);
    return (
      <Badge variant="secondary" className="text-[10px]">
        {opt?.label ?? String(value)}
      </Badge>
    );
  }
  if (field.field_type === "date") {
    return <span className="text-xs">{formatDate(value as string)}</span>;
  }
  return <span className="text-xs">{String(value)}</span>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
