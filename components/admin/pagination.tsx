import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
  className?: string;
};

function buildHref(basePath: string, page: number, searchParams?: Record<string, string>): string {
  const params = new URLSearchParams(searchParams);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t pt-4",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={page <= 1}
        >
          <Link
            href={page <= 1 ? "#" : buildHref(basePath, page - 1, searchParams)}
            aria-label="Previous page"
          >
            Previous
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={page >= totalPages}
        >
          <Link
            href={
              page >= totalPages ? "#" : buildHref(basePath, page + 1, searchParams)
            }
            aria-label="Next page"
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}
