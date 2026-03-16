import Image from "next/image";
import { Megaphone } from "lucide-react";
import type { Advertisement, AdPlacement } from "@/lib/types/advertising";
import { getActiveAdsByPlacement } from "@/lib/actions/advertising";
import { AdClickTracker } from "./ad-click-tracker";
import { AdContentRenderer } from "./ad-content-renderer";

type AdSlotProps = {
  placement: AdPlacement;
  className?: string;
  /** "banner" = full-width single, "grid" = side-by-side cards */
  layout?: "banner" | "grid";
  /** Max number of ads to show */
  limit?: number;
};

export async function AdSlot({
  placement,
  className = "",
  layout = "banner",
  limit = 3,
}: AdSlotProps) {
  const ads = await getActiveAdsByPlacement(placement);
  if (ads.length === 0) return null;

  const visibleAds = ads.slice(0, limit);

  if (layout === "grid") {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {visibleAds.map((ad) => (
          <AdCard key={ad.id} ad={ad} />
        ))}
      </div>
    );
  }

  const ad = visibleAds[0];
  return (
    <div className={className}>
      <AdBanner ad={ad} />
    </div>
  );
}

function AdBanner({ ad }: { ad: Advertisement }) {
  const hasImage = !!ad.image_url;
  const hasRichContent = !!ad.html_content;

  const content = (
    <div className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-gradient-to-r from-muted/50 via-card to-muted/50 transition-all hover:shadow-md hover:border-primary/20 group">
      {hasImage ? (
        /* ── Image banner ── */
        <div className="relative w-full aspect-[4/1] sm:aspect-[5/1]">
          <Image
            src={ad.image_url!}
            alt={ad.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
          {/* Overlay gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Title overlay on image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 sm:px-6 sm:pb-4">
            <p className="font-semibold text-white text-sm sm:text-base drop-shadow-sm">
              {ad.title}
            </p>
            {ad.description && (
              <p className="text-white/80 text-xs sm:text-sm mt-0.5 line-clamp-1 drop-shadow-sm">
                {ad.description}
              </p>
            )}
          </div>
        </div>
      ) : hasRichContent ? (
        /* ── Rich text content ── */
        <div className="flex items-start gap-4 p-4 sm:p-6">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm sm:text-base mb-1">
              {ad.title}
            </p>
            <AdContentRenderer content={ad.html_content!} />
          </div>
        </div>
      ) : (
        /* ── Text-only banner ── */
        <div className="flex items-center gap-4 p-4 sm:px-6 sm:py-5">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm sm:text-base">
              {ad.title}
            </p>
            {ad.description && (
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 line-clamp-2">
                {ad.description}
              </p>
            )}
          </div>
          {ad.link_url && (
            <span className="hidden sm:inline-flex shrink-0 text-xs font-medium text-primary group-hover:underline">
              Learn more →
            </span>
          )}
        </div>
      )}

      {/* Sponsored label */}
      <span className="absolute top-2 right-2 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded">
        Sponsored
      </span>
    </div>
  );

  if (ad.link_url) {
    return (
      <AdClickTracker adId={ad.id} href={ad.link_url}>
        {content}
      </AdClickTracker>
    );
  }

  return content;
}

function AdCard({ ad }: { ad: Advertisement }) {
  const hasImage = !!ad.image_url;
  const hasRichContent = !!ad.html_content;

  const content = (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:shadow-md hover:border-primary/20 h-full group">
      {hasImage ? (
        <div className="relative w-full aspect-[16/9]">
          <Image
            src={ad.image_url!}
            alt={ad.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : hasRichContent ? (
        <div className="p-4 border-b border-border/40">
          <AdContentRenderer content={ad.html_content!} />
        </div>
      ) : (
        <div className="flex items-center justify-center aspect-[16/9] bg-muted/30">
          <Megaphone className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-3 sm:p-4">
        <p className="font-semibold text-sm text-foreground line-clamp-1">
          {ad.title}
        </p>
        {ad.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {ad.description}
          </p>
        )}
        {ad.link_url && (
          <span className="inline-flex mt-2 text-xs font-medium text-primary group-hover:underline">
            Learn more →
          </span>
        )}
      </div>
      <span className="absolute top-2 right-2 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded">
        Sponsored
      </span>
    </div>
  );

  if (ad.link_url) {
    return (
      <AdClickTracker adId={ad.id} href={ad.link_url}>
        {content}
      </AdClickTracker>
    );
  }

  return content;
}
