import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Building2 } from "lucide-react";

type Props = {
  href: string;
  title: string;
  imageUrl?: string | null;
  location: string | null;
  categoryName?: string | null;
  priceLabel: string;
};

export function PublicProfileListingRow({
  href,
  title,
  imageUrl,
  location,
  categoryName,
  priceLabel,
}: Props) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 w-full flex-col gap-3 rounded-lg border border-border p-3 transition-all hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm sm:flex-row sm:items-stretch sm:gap-4"
    >
      {imageUrl ? (
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-20 sm:w-28">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 639px) 100vw, 112px"
          />
        </div>
      ) : (
        <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted sm:h-20 sm:w-28">
          <Building2 className="h-5 w-5 text-muted-foreground/30" />
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug line-clamp-2 break-words group-hover:text-primary transition-colors">
            {title}
          </p>
          {location ? (
            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words">{location}</span>
            </p>
          ) : null}
        </div>
        <div
          className={
            categoryName
              ? "flex min-w-0 w-full items-center justify-between gap-2"
              : "flex min-w-0 w-full items-center justify-end gap-2"
          }
        >
          {categoryName ? (
            <Badge variant="outline" className="min-w-0 max-w-[65%] text-[10px] px-1.5 py-0 font-normal">
              <span className="block truncate">{categoryName}</span>
            </Badge>
          ) : null}
          <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{priceLabel}</span>
        </div>
      </div>
      <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
    </Link>
  );
}
