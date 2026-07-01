"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/generated/prisma/client";

type PromotionsCarouselProps = {
  promotions: Array<
    Pick<Promotion, "id" | "title" | "description" | "imageUrl" | "sortOrder">
  >;
  hrefFor?: (p: { linkedCategoryId?: string | null }) => string | null;
  linkedCategoryIdMap?: Record<string, string | null>;
};

export function PromotionsCarousel({
  promotions,
  hrefFor,
  linkedCategoryIdMap,
}: PromotionsCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || promotions.length <= 1) return;
    const t = setInterval(() => {
      setActive((i) => (i + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(t);
  }, [paused, promotions.length]);

  if (promotions.length === 0) return null;

  return (
    <section
      aria-label="Promotions"
      className="relative overflow-hidden rounded-xl bg-card shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-56 sm:h-72 md:h-80">
        {promotions.map((promo, idx) => {
          const href =
            hrefFor && linkedCategoryIdMap
              ? hrefFor({ linkedCategoryId: linkedCategoryIdMap[promo.id] ?? null })
              : null;
          const Wrapper = href ? "a" : "div";
          return (
            <div
              key={promo.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                idx === active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={idx !== active}
            >
              <Wrapper
                {...(href ? { href } : {})}
                className="group block h-full w-full"
              >
                {promo.imageUrl && (
                   
                  <img
                    src={promo.imageUrl}
                    alt={promo.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/40 to-transparent" style={{ background: "linear-gradient(to top, rgba(20,15,5,0.85), rgba(20,15,5,0.4) 40%, transparent 70%)" }} />
                <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7">
                  <span className="inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Special
                  </span>
                  <h3 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl md:text-3xl">
                    {promo.title}
                  </h3>
                  {promo.description && (
                    <p className="mt-1 max-w-prose text-sm text-white/85 sm:text-base">
                      {promo.description}
                    </p>
                  )}
                </div>
              </Wrapper>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {promotions.length > 1 && (
        <>
          <button
            aria-label="Previous promotion"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur hover:bg-white/30"
            onClick={() =>
              setActive((i) => (i - 1 + promotions.length) % promotions.length)
            }
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            aria-label="Next promotion"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 backdrop-blur hover:bg-white/30"
            onClick={() => setActive((i) => (i + 1) % promotions.length)}
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Go to promotion ${idx + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === active ? "w-6 bg-white" : "w-2 bg-white/50",
                )}
                onClick={() => setActive(idx)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
