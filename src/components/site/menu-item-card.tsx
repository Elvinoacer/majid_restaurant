"use client";

import { useState } from "react";
import {
  Flame,
  Leaf,
  Sparkles,
  Star,
  Minus,
  Plus,
  MessageCircle,
  ShoppingCart,
  Check,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  buildSingleItemWhatsAppMessage,
  buildWhatsAppUrl,
  formatKsh,
} from "@/lib/whatsapp/order";
import { useCart } from "@/lib/cart/store";
import { toast } from "sonner";
import type { MenuItemWithTags } from "@/lib/menu";

type MenuItemCardProps = {
  item: MenuItemWithTags;
  restaurantName: string;
  whatsappPhone: string;
  customerName?: string;
  customerPhone?: string;
};

export function MenuItemCard({
  item,
  restaurantName,
  whatsappPhone,
  customerName,
  customerPhone,
}: MenuItemCardProps) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = !item.isAvailable;

  const addLine = useCart((s) => s.addLine);

  const handleWhatsAppOrder = () => {
    const message = buildSingleItemWhatsAppMessage({
      restaurantName,
      itemName: item.name,
      quantity: qty,
      customerName,
      customerPhone,
    });
    const url = buildWhatsAppUrl(whatsappPhone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddToCart = () => {
    addLine(
      {
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        imageUrl: item.imageUrl,
      },
      qty,
    );
    setAdded(true);
    toast.success(`${qty}× ${item.name} added to cart`);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card elevation-1 transition-all duration-200",
        "hover:elevation-2 hover:border-primary/20 hover:-translate-y-0.5",
        soldOut && "opacity-75 hover:translate-y-0 hover:elevation-1",
      )}
      data-sold-out={soldOut ? "true" : undefined}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105",
              soldOut && "grayscale",
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/60">
            <ImageOff className="h-6 w-6" />
            <span className="text-[11px] uppercase tracking-wide">No image</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
              <Star className="h-3 w-3 fill-current" />
              Popular
            </span>
          )}
          {item.isSpicy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-paprika px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              <Flame className="h-3 w-3" />
              Spicy
            </span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-background">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-snug text-foreground">
            {item.name}
          </h3>
          <span className="shrink-0 font-display text-base font-bold tabular-nums text-primary">
            <span className="text-xs font-normal text-muted-foreground">KSh </span>
            {formatKsh(item.price)}
          </span>
        </div>

        {item.description && (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Dietary flags */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-muted-foreground">
          {item.isVegetarian && (
            <span className="inline-flex items-center gap-0.5">
              <Leaf className="h-3 w-3 text-success" /> Veg
            </span>
          )}
          {item.isVegan && (
            <span className="inline-flex items-center gap-0.5">
              <Sparkles className="h-3 w-3 text-success" /> Vegan
            </span>
          )}
          {item.isHalal && (
            <span className="inline-flex items-center gap-0.5">Halal</span>
          )}
          {item.tags.length > 0 && (
            <span className="text-muted-foreground/70">
              · {item.tags.slice(0, 3).join(" · ")}
            </span>
          )}
        </div>

        {/* Actions */}
        {!soldOut && (
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center rounded-lg border border-border bg-background">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-l-lg text-foreground transition-colors hover:bg-accent/10 disabled:opacity-40"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span
                  className="w-9 text-center text-sm font-semibold tabular-nums"
                  aria-label={`Quantity ${qty}`}
                >
                  {qty}
                </span>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-foreground transition-colors hover:bg-accent/10"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                size="sm"
                variant={added ? "secondary" : "default"}
                onClick={handleAddToCart}
                className="flex-1 gap-1.5 transition-all"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to cart
                  </>
                )}
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsAppOrder}
              className="gap-1.5"
            >
              <MessageCircle className="h-4 w-4" />
              Order via WhatsApp
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
