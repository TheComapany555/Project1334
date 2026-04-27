import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Visual wrapper for an analytics DataTable. Renders a titled section header
 * above the bordered table card, matching the rest of the admin layout.
 */
export function TableSection({
  title,
  description,
  children,
  className,
}: Props) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-0.5 px-0.5">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
