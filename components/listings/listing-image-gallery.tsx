"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string };

type Props = {
  images: GalleryImage[];
  title: string;
};

/**
 * Interactive listing gallery: taps/thumbnails change the main image (SSR page was static-only).
 */
export function ListingImageGallery({ images, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const go = useCallback(
    (delta: number) => {
      setActiveIndex((i) => {
        const next = i + delta;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [images.length],
  );

  if (images.length === 0) return null;

  const active = images[activeIndex] ?? images[0];

  return (
    <div className="max-w-full overflow-hidden">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <Image
          key={active.id}
          src={active.url}
          alt={`${title} — photo ${activeIndex + 1} of ${images.length}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
          priority={activeIndex === 0}
        />

        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-border bg-background/90 shadow-md touch-manipulation backdrop-blur-sm md:left-3"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-border bg-background/90 shadow-md touch-manipulation backdrop-blur-sm md:right-3"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <p className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground backdrop-blur-sm">
              {activeIndex + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="flex gap-2 border-t border-border p-3 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          role="tablist"
          aria-label="Listing photos"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-16 min-h-[44px] w-24 min-w-[96px] shrink-0 overflow-hidden rounded-md border bg-muted touch-manipulation outline-none transition-[box-shadow,transform] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                i === activeIndex
                  ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "border-border active:scale-[0.98]",
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
