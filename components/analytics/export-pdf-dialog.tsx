"use client";

// Feature #5: shared "Export PDF" dialog used by every analytics dashboard.
//
// The dialog owns selection state (which sections + which period) and hands
// off to a per-dashboard `buildAndDownload` callback that knows how to render
// the right report component. This keeps the dashboards almost identical from
// an integration perspective while letting each report differ in data shape.

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Loader2 } from "lucide-react";

export type ExportSection<TKey extends string> = {
  key: TKey;
  label: string;
  description?: string;
  /** Whether the section is selected by default. Defaults to true. */
  defaultSelected?: boolean;
  /** When true, the section can't be unchecked (e.g. cover page). */
  alwaysOn?: boolean;
};

export type ExportPeriodOption = {
  value: number;
  label: string;
};

export type ExportPdfDialogProps<TKey extends string> = {
  /** Title at the top of the dialog. */
  title?: string;
  /** Short description under the title. */
  description?: string;
  /** Sections the user can toggle. */
  sections: ExportSection<TKey>[];
  /** Optional period picker. Omit to hide it (e.g. admin report has fixed window). */
  periodOptions?: ExportPeriodOption[];
  /** Default selected period (must match one of `periodOptions`). */
  defaultPeriod?: number;
  /** Called when the user clicks "Download". Should generate + download the PDF. */
  onExport: (input: { sections: TKey[]; periodDays?: number }) => Promise<void>;
  /** Optional custom trigger button. Defaults to an outline-style button. */
  triggerLabel?: string;
  /** Optional className applied to the trigger button. */
  triggerClassName?: string;
};

export function ExportPdfDialog<TKey extends string>({
  title = "Export PDF",
  description = "Choose what to include in the report.",
  sections,
  periodOptions,
  defaultPeriod,
  onExport,
  triggerLabel = "Export PDF",
  triggerClassName,
}: ExportPdfDialogProps<TKey>) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<TKey>>(
    () =>
      new Set(
        sections.filter((s) => s.alwaysOn || s.defaultSelected !== false).map((s) => s.key),
      ),
  );
  const [period, setPeriod] = useState<number | undefined>(
    defaultPeriod ?? periodOptions?.[0]?.value,
  );
  const [busy, setBusy] = useState(false);

  function toggleSection(key: TKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    if (selected.size === 0) {
      toast.error("Pick at least one section to include.");
      return;
    }
    setBusy(true);
    try {
      await onExport({
        sections: Array.from(selected),
        periodDays: period,
      });
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not generate the PDF.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <FileDown className="h-4 w-4 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {periodOptions && periodOptions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Time period
            </Label>
            <Tabs
              value={String(period ?? periodOptions[0].value)}
              onValueChange={(v) => setPeriod(Number(v))}
            >
              <TabsList className="w-full">
                {periodOptions.map((opt) => (
                  <TabsTrigger
                    key={opt.value}
                    value={String(opt.value)}
                    className="flex-1"
                  >
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {periodOptions && periodOptions.length > 0 && <Separator />}

        <div className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sections to include
          </Label>
          <div className="space-y-2.5">
            {sections.map((section) => {
              const checked = selected.has(section.key);
              return (
                <div key={section.key} className="flex items-start gap-3">
                  <Checkbox
                    id={`pdf-section-${section.key}`}
                    checked={checked}
                    disabled={section.alwaysOn || busy}
                    onCheckedChange={() =>
                      !section.alwaysOn && toggleSection(section.key)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`pdf-section-${section.key}`}
                      className="text-sm font-medium leading-snug cursor-pointer"
                    >
                      {section.label}
                      {section.alwaysOn && (
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                          (always included)
                        </span>
                      )}
                    </Label>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
