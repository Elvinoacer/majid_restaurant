"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/generated/prisma/client";

type GalleryGridProps = {
  images: Array<Pick<GalleryImage, "id" | "imageUrl" | "caption" | "category" | "sortOrder">>;
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  interior: "Interior",
  staff: "Staff",
  customers: "Customers",
};

export function GalleryGrid({ images }: GalleryGridProps) {
  const [filter, setFilter] = useState<string | "all">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    images.forEach((img) => img.category && set.add(img.category));
    return Array.from(set);
  }, [images]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? images
        : images.filter((img) => img.category === filter),
    [filter, images],
  );

  const closeLightbox = () => setLightboxIndex(null);
  const goPrev = () =>
    setLightboxIndex((i) =>
      i === null ? i : (i - 1 + filtered.length) % filtered.length,
    );
  const goNext = () =>
    setLightboxIndex((i) => (i === null ? i : (i + 1) % filtered.length));

  // Keyboard navigation.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, filtered.length]);

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Gallery categories">
        <CategoryChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
          >
            {CATEGORY_LABELS[c] ?? c}
          </CategoryChip>
        ))}
      </div>

      {/* Masonry-ish grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
        {filtered.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(idx)}
            className={cn(
              "group relative overflow-hidden rounded-lg bg-muted",
              // Make the 6th item span 2x2 for visual rhythm
              idx % 7 === 0 && "col-span-2 row-span-2",
            )}
            aria-label={`Open image: ${img.caption ?? "gallery image"}`}
          >
            { }
            <img
              src={img.imageUrl}
              alt={img.caption ?? "Gallery image"}
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-48"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-[11px] text-white">{img.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={closeLightbox}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={closeLightbox}
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <figure
            className="max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            { }
            <img
              src={filtered[lightboxIndex].imageUrl}
              alt={filtered[lightboxIndex].caption ?? "Gallery image"}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
            {filtered[lightboxIndex].caption && (
              <figcaption className="mt-3 text-center text-sm text-white/90">
                {filtered[lightboxIndex].caption}
              </figcaption>
            )}
          </figure>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground/80 hover:bg-accent/10 hover:text-accent border border-border",
      )}
    >
      {children}
    </button>
  );
}
