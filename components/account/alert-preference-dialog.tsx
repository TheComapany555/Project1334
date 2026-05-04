"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bell,
  DollarSign,
  Loader2,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuLocalityAutocomplete } from "@/components/location/au-locality-autocomplete";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createAlertPreference,
  updateAlertPreference,
  type BuyerAlertPreferenceInput,
} from "@/lib/actions/buyer-alert-preferences";
import type { BuyerAlertPreference } from "@/lib/types/buyer-panel";

const AU_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "Northern Territory" },
] as const;

const PRICE_QUICK_PICKS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Any", min: null, max: null },
  { label: "Under $250k", min: null, max: 250_000 },
  { label: "Under $500k", min: null, max: 500_000 },
  { label: "Under $1M", min: null, max: 1_000_000 },
  { label: "$1M–$5M", min: 1_000_000, max: 5_000_000 },
  { label: "$5M+", min: 5_000_000, max: null },
];

const NO_VALUE = "__none__";

type CategoryOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, edits an existing preference; otherwise creates a new one. */
  editing?: BuyerAlertPreference | null;
  categories: CategoryOption[];
  onSaved: (next: BuyerAlertPreference) => void;
};

type FormState = {
  label: string;
  business_type: string;
  category_id: string;
  state: string;
  suburb: string;
  min_price: string;
  max_price: string;
};

const EMPTY_FORM: FormState = {
  label: "",
  business_type: "",
  category_id: "",
  state: "",
  suburb: "",
  min_price: "",
  max_price: "",
};

export function AlertPreferenceDialog({
  open,
  onOpenChange,
  editing,
  categories,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        label: editing.label ?? "",
        business_type: editing.business_type ?? "",
        category_id: editing.category_id ?? "",
        state: editing.state ?? "",
        suburb: editing.suburb ?? "",
        min_price: editing.min_price?.toString() ?? "",
        max_price: editing.max_price?.toString() ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPriceRange(min: number | null, max: number | null) {
    setForm((prev) => ({
      ...prev,
      min_price: min === null ? "" : String(min),
      max_price: max === null ? "" : String(max),
    }));
  }

  const categoryName = useMemo(() => {
    if (!form.category_id) return null;
    return categories.find((c) => c.id === form.category_id)?.name ?? null;
  }, [form.category_id, categories]);

  const previewChips = useMemo(() => {
    const out: { tone: "category" | "location" | "price"; label: string }[] = [];
    if (form.business_type.trim()) out.push({ tone: "category", label: form.business_type.trim() });
    if (categoryName) out.push({ tone: "category", label: categoryName });
    const loc = [form.suburb.trim(), form.state.trim()].filter(Boolean).join(", ");
    if (loc) out.push({ tone: "location", label: loc });
    const pr = formatPriceRange(parseAmount(form.min_price), parseAmount(form.max_price));
    if (pr) out.push({ tone: "price", label: pr });
    return out;
  }, [form, categoryName]);

  const suggestedLabel = useMemo(() => buildSuggestedLabel(form, categoryName), [form, categoryName]);
  const isValid = previewChips.length > 0;
  const minNum = parseAmount(form.min_price);
  const maxNum = parseAmount(form.max_price);
  const priceRangeError =
    minNum != null && maxNum != null && minNum > maxNum
      ? "Minimum must be less than or equal to maximum."
      : null;

  function handleSave() {
    const payload: BuyerAlertPreferenceInput = {
      label: form.label.trim() || suggestedLabel || null,
      business_type: form.business_type.trim() || null,
      category_id: form.category_id || null,
      state: form.state || null,
      suburb: form.suburb.trim() || null,
      min_price: minNum,
      max_price: maxNum,
      is_active: editing?.is_active ?? true,
    };

    startTransition(async () => {
      const res = editing
        ? await updateAlertPreference(editing.id, payload)
        : await createAlertPreference(payload);
      if (res.ok) {
        toast.success(editing ? "Alert updated." : "Alert saved — we'll watch for matches.");
        onSaved(res.preference);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const dialogTitle = editing ? "Edit alert" : "New listing alert";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
              <Bell className="h-3.5 w-3.5" aria-hidden />
            </span>
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            We&apos;ll email and notify you in-app the moment a matching listing is published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* ── What ───────────────────────────────────────────────── */}
          <FieldGroup
            icon={<Tag className="h-3 w-3" aria-hidden />}
            title="What you're looking for"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="alert-business-type"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Business type
                </Label>
                <Input
                  id="alert-business-type"
                  value={form.business_type}
                  onChange={(e) => update("business_type", e.target.value)}
                  placeholder="e.g. café, gym, salon"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="alert-category"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Category
                </Label>
                <Select
                  value={form.category_id || NO_VALUE}
                  onValueChange={(v) => update("category_id", v === NO_VALUE ? "" : v)}
                >
                  <SelectTrigger id="alert-category">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VALUE}>Any category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FieldGroup>

          {/* ── Where ──────────────────────────────────────────────── */}
          <FieldGroup
            icon={<MapPin className="h-3 w-3" aria-hidden />}
            title="Where"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="alert-state" className="text-xs font-medium text-muted-foreground">
                  State
                </Label>
                <Select
                  value={form.state || NO_VALUE}
                  onValueChange={(v) => update("state", v === NO_VALUE ? "" : v)}
                >
                  <SelectTrigger id="alert-state">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VALUE}>Any state</SelectItem>
                    {AU_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alert-suburb" className="text-xs font-medium text-muted-foreground">
                  Suburb (optional)
                </Label>
                <AuLocalityAutocomplete
                  id="alert-suburb"
                  value={form.suburb}
                  onChange={(v) => update("suburb", v)}
                  maxLength={80}
                  onResolved={(p) => {
                    if (p.suburb) update("suburb", p.suburb);
                    if (p.state) update("state", p.state);
                  }}
                  placeholder="e.g. Surry Hills"
                />
              </div>
            </div>
          </FieldGroup>

          {/* ── Price ──────────────────────────────────────────────── */}
          <FieldGroup
            icon={<DollarSign className="h-3 w-3" aria-hidden />}
            title="Price range"
          >
            <div className="flex flex-wrap gap-1.5">
              {PRICE_QUICK_PICKS.map((p) => {
                const active =
                  parseAmount(form.min_price) === p.min && parseAmount(form.max_price) === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPriceRange(p.min, p.max)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-muted text-muted-foreground ring-border hover:bg-muted/80",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="alert-min" className="text-xs font-medium text-muted-foreground">
                  Min (AUD)
                </Label>
                <Input
                  id="alert-min"
                  inputMode="numeric"
                  value={form.min_price}
                  onChange={(e) => update("min_price", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alert-max" className="text-xs font-medium text-muted-foreground">
                  Max (AUD)
                </Label>
                <Input
                  id="alert-max"
                  inputMode="numeric"
                  value={form.max_price}
                  onChange={(e) => update("max_price", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="500000"
                />
              </div>
            </div>
            {priceRangeError && (
              <p className="text-[11px] text-destructive">{priceRangeError}</p>
            )}
          </FieldGroup>

          {/* ── Name (last so the suggestion can reflect filters) ──── */}
          <FieldGroup
            icon={<Sparkles className="h-3 w-3" aria-hidden />}
            title="Name (optional)"
          >
            <Input
              id="alert-label"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              placeholder={suggestedLabel || "e.g. Sydney cafés under $500k"}
              maxLength={80}
            />
            {!form.label && suggestedLabel && (
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll save it as &ldquo;{suggestedLabel}&rdquo; if you leave this blank.
              </p>
            )}
          </FieldGroup>

          {/* ── Live preview ───────────────────────────────────────── */}
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              We&apos;ll alert you about
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {previewChips.length === 0 ? (
                <span className="text-[11px] italic text-muted-foreground">
                  Add at least one filter to save this alert.
                </span>
              ) : (
                previewChips.map((chip, i) => <PreviewChip key={i} {...chip} />)
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={pending || !isValid || !!priceRangeError}
            className="min-w-[8rem]"
          >
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function FieldGroup({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-foreground/70">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function PreviewChip({ tone, label }: { tone: "category" | "location" | "price"; label: string }) {
  const cls: Record<typeof tone, string> = {
    category:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    location:
      "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-1 ring-sky-500/20",
    price:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        cls[tone],
      )}
    >
      {label}
    </span>
  );
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "";
  if (min != null && max != null) return `${formatShort(min)}–${formatShort(max)}`;
  if (max != null) return `up to ${formatShort(max)}`;
  return `from ${formatShort(min!)}`;
}

function buildSuggestedLabel(form: FormState, categoryName: string | null): string {
  const subject = form.business_type.trim() || categoryName || "Listing";
  const locationParts = [form.suburb.trim(), form.state.trim()].filter(Boolean).join(", ");
  const pr = formatPriceRange(parseAmount(form.min_price), parseAmount(form.max_price));
  const pieces = [subject];
  if (locationParts) pieces.push("in", locationParts);
  if (pr) pieces.push(pr);
  return pieces.join(" ").trim();
}
