import { cn } from "@/lib/utils";

const STATUS_TONES: Record<string, string> = {
  paid: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50",
  active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50",
  approved: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50",
  pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50",
  invoiced: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/50",
  trialing: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/50",
  past_due: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50",
  cancelled: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/50",
  expired: "bg-muted text-muted-foreground border-border",
  disabled: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/50",
  under_offer: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50",
  sold: "bg-primary/10 text-primary border-primary/20",
  unpublished: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/50",
  basic: "bg-muted text-muted-foreground border-border",
  standard: "bg-primary/10 text-primary border-primary/20",
  featured: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/50",
};

export function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone =
    STATUS_TONES[status.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap",
        tone,
      )}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
