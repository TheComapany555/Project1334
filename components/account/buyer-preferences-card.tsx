"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  Pencil,
  Loader2,
  Building2,
  Target,
  DollarSign,
  MapPin,
  CalendarClock,
} from "lucide-react";
import {
  updateBuyerAccount,
  type BuyerFundingStatus,
  type BuyerPreferences,
  type BuyerTimeframe,
} from "@/lib/actions/buyer-account";

type Props = {
  preferences: BuyerPreferences;
};

const FUNDING_LABEL: Record<BuyerFundingStatus, string> = {
  self_funded: "Self-funded",
  pre_approved: "Pre-approved",
  seeking_finance: "Seeking finance",
  unspecified: "Unspecified",
};

const TIMEFRAME_LABEL: Record<BuyerTimeframe, string> = {
  lt_3m: "Within 3 months",
  "3_6m": "3–6 months",
  "6_12m": "6–12 months",
  gt_12m: "More than 12 months",
  unspecified: "Unspecified",
};

export function BuyerPreferencesCard({ preferences: initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [isSaving, startSave] = useTransition();

  // Edit-mode state
  const [budgetMin, setBudgetMin] = useState(
    initial.budget_min != null ? String(initial.budget_min) : "",
  );
  const [budgetMax, setBudgetMax] = useState(
    initial.budget_max != null ? String(initial.budget_max) : "",
  );
  const [industries, setIndustries] = useState<string[]>(
    initial.preferred_industries ?? [],
  );
  const [industryDraft, setIndustryDraft] = useState("");
  const [locations, setLocations] = useState<string[]>(
    initial.preferred_locations ?? [],
  );
  const [locationDraft, setLocationDraft] = useState("");
  const [funding, setFunding] = useState<BuyerFundingStatus | "unset">(
    initial.funding_status ?? "unset",
  );
  const [timeframe, setTimeframe] = useState<BuyerTimeframe | "unset">(
    initial.timeframe ?? "unset",
  );
  const [locationText, setLocationText] = useState(
    initial.location_text ?? "",
  );

  // Snapshot used for display + cancel.
  const [snapshot, setSnapshot] = useState<BuyerPreferences>(initial);

  const handleCancel = () => {
    setBudgetMin(snapshot.budget_min != null ? String(snapshot.budget_min) : "");
    setBudgetMax(snapshot.budget_max != null ? String(snapshot.budget_max) : "");
    setIndustries(snapshot.preferred_industries ?? []);
    setIndustryDraft("");
    setLocations(snapshot.preferred_locations ?? []);
    setLocationDraft("");
    setFunding(snapshot.funding_status ?? "unset");
    setTimeframe(snapshot.timeframe ?? "unset");
    setLocationText(snapshot.location_text ?? "");
    setEditing(false);
  };

  const handleSave = () => {
    const min = budgetMin.trim() ? Number(budgetMin) : null;
    const max = budgetMax.trim() ? Number(budgetMax) : null;
    if (min != null && (!Number.isFinite(min) || min < 0)) {
      toast.error("Minimum budget must be a non-negative number.");
      return;
    }
    if (max != null && (!Number.isFinite(max) || max < 0)) {
      toast.error("Maximum budget must be a non-negative number.");
      return;
    }
    if (min != null && max != null && min > max) {
      toast.error("Minimum budget can't be greater than maximum.");
      return;
    }

    // Pull in any draft tokens the user typed but didn't add via Enter.
    const finalIndustries = mergeDraft(industries, industryDraft);
    const finalLocations = mergeDraft(locations, locationDraft);

    startSave(async () => {
      const res = await updateBuyerAccount({
        budget_min: min,
        budget_max: max,
        preferred_industries: finalIndustries,
        preferred_locations: finalLocations,
        funding_status: funding === "unset" ? null : funding,
        timeframe: timeframe === "unset" ? null : timeframe,
        location_text: locationText.trim() || null,
      });
      if (res.ok) {
        toast.success("Preferences saved");
        setSnapshot({
          budget_min: min,
          budget_max: max,
          preferred_industries: finalIndustries,
          preferred_locations: finalLocations,
          funding_status: funding === "unset" ? null : funding,
          timeframe: timeframe === "unset" ? null : timeframe,
          location_text: locationText.trim() || null,
        });
        setIndustries(finalIndustries);
        setLocations(finalLocations);
        setIndustryDraft("");
        setLocationDraft("");
        setEditing(false);
      } else {
        toast.error(res.error ?? "Couldn't save");
      }
    });
  };

  // ─── Display values ───
  const budgetDisplay = fmtBudget(snapshot.budget_min, snapshot.budget_max);
  const industriesDisplay = snapshot.preferred_industries ?? [];
  const locationsDisplay = snapshot.preferred_locations ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b">
        <div className="space-y-0.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            What you're looking for
          </CardTitle>
          <CardDescription>
            Brokers see this when you enquire on a listing — fill it in once
            and skip explaining yourself in every reply.
          </CardDescription>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="shrink-0"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* Budget */}
        <FieldRow icon={DollarSign} label="Budget range">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="text-sm"
              />
            </div>
          ) : (
            <DisplayValue value={budgetDisplay} />
          )}
        </FieldRow>

        <Separator />

        {/* Timeframe */}
        <FieldRow icon={CalendarClock} label="Timeframe to purchase">
          {editing ? (
            <Select
              value={timeframe}
              onValueChange={(v) => setTimeframe(v as typeof timeframe)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not specified</SelectItem>
                {(Object.keys(TIMEFRAME_LABEL) as BuyerTimeframe[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIMEFRAME_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <DisplayValue
              value={
                snapshot.timeframe ? TIMEFRAME_LABEL[snapshot.timeframe] : null
              }
            />
          )}
        </FieldRow>

        <Separator />

        {/* Funding */}
        <FieldRow icon={DollarSign} label="Funding status">
          {editing ? (
            <Select
              value={funding}
              onValueChange={(v) => setFunding(v as typeof funding)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not specified</SelectItem>
                {(Object.keys(FUNDING_LABEL) as BuyerFundingStatus[]).map(
                  (f) => (
                    <SelectItem key={f} value={f}>
                      {FUNDING_LABEL[f]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          ) : (
            <DisplayValue
              value={
                snapshot.funding_status
                  ? FUNDING_LABEL[snapshot.funding_status]
                  : null
              }
            />
          )}
        </FieldRow>

        <Separator />

        {/* Preferred industries */}
        <FieldRow icon={Building2} label="Preferred industries">
          {editing ? (
            <ChipsInput
              values={industries}
              draft={industryDraft}
              setDraft={setIndustryDraft}
              onAdd={(v) =>
                setIndustries((arr) =>
                  Array.from(new Set([...arr, v])).slice(0, 20),
                )
              }
              onRemove={(idx) =>
                setIndustries((arr) => arr.filter((_, i) => i !== idx))
              }
              placeholder="e.g. Cafe, Childcare"
            />
          ) : industriesDisplay.length === 0 ? (
            <DisplayValue value={null} />
          ) : (
            <div className="flex flex-wrap gap-1">
              {industriesDisplay.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[11px]">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </FieldRow>

        <Separator />

        {/* Preferred locations */}
        <FieldRow icon={MapPin} label="Preferred locations">
          {editing ? (
            <ChipsInput
              values={locations}
              draft={locationDraft}
              setDraft={setLocationDraft}
              onAdd={(v) =>
                setLocations((arr) =>
                  Array.from(new Set([...arr, v])).slice(0, 20),
                )
              }
              onRemove={(idx) =>
                setLocations((arr) => arr.filter((_, i) => i !== idx))
              }
              placeholder="e.g. Sydney, North Shore"
            />
          ) : locationsDisplay.length === 0 ? (
            <DisplayValue value={null} />
          ) : (
            <div className="flex flex-wrap gap-1">
              {locationsDisplay.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[11px]">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </FieldRow>

        <Separator />

        {/* Free-text location */}
        <FieldRow icon={MapPin} label="Where you're based">
          {editing ? (
            <Input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. Bondi, Sydney"
              className="text-sm"
            />
          ) : (
            <DisplayValue value={snapshot.location_text} />
          )}
        </FieldRow>

        {editing && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              Save changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-start">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}

function DisplayValue({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <p className="text-sm text-muted-foreground italic">Not set</p>;
  }
  return <p className="text-sm font-medium">{value}</p>;
}

function ChipsInput({
  values,
  draft,
  setDraft,
  onAdd,
  onRemove,
  placeholder,
}: {
  values: string[];
  draft: string;
  setDraft: (s: string) => void;
  onAdd: (v: string) => void;
  onRemove: (idx: number) => void;
  placeholder: string;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault();
      onAdd(draft.trim());
      setDraft("");
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onRemove(values.length - 1);
    }
  };
  const handleBlur = () => {
    if (draft.trim()) {
      onAdd(draft.trim());
      setDraft("");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 rounded-md border bg-background px-2 py-1.5 min-h-9">
        {values.map((v, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="text-[11px] gap-1 cursor-pointer"
            onClick={() => onRemove(i)}
            title="Click to remove"
          >
            {v}
            <X className="h-2.5 w-2.5" />
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={handleBlur}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Press Enter or comma to add. Click a chip to remove.
      </p>
    </div>
  );
}

function fmtBudget(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `from ${fmt(min)}`;
  return `up to ${fmt(max!)}`;
}

function mergeDraft(values: string[], draft: string): string[] {
  const v = draft.trim();
  if (!v) return values;
  return Array.from(new Set([...values, v])).slice(0, 20);
}
