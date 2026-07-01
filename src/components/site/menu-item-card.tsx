"use client";

import { useState } from "react";
import { Flame, Leaf, Sparkles, Star, Minus, Plus, MessageCircle, ShoppingCart, Check } from "lucide-react";
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
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        soldOut && "opacity-70",
      )}
      data-sold-out={soldOut ? "true" : undefined}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.imageUrl ? (
           
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
              soldOut && "grayscale",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {item.isPopular && (
            <Badge className="bg-accent text-accent-foreground">
              <Star className="mr-1 h-3 w-3 fill-current" />
              Popular
            </Badge>
          )}
          {item.isSpicy && (
            <Badge className="bg-brand-paprika text-white">
              <Flame className="mr-1 h-3 w-3" />
              Spicy
            </Badge>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wider text-background">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-foreground">
            {item.name}
          </h3>
          <span className="shrink-0 font-semibold text-primary">
            KSh {formatKsh(item.price)}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {item.description}
          </p>
        )}

        {/* Dietary flags */}
        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {item.isVegetarian && (
            <span className="inline-flex items-center gap-0.5">
              <Leaf className="h-3 w-3" /> Veg
            </span>
          )}
          {item.isVegan && (
            <span className="inline-flex items-center gap-0.5">
              <Sparkles className="h-3 w-3" /> Vegan
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
              <div className="inline-flex items-center rounded-md border border-border">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center text-foreground hover:bg-accent/10"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span
                  className="w-8 text-center text-sm font-medium"
                  aria-label={`Quantity ${qty}`}
                >
                  {qty}
                </span>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center text-foreground hover:bg-accent/10"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="sm"
                variant={added ? "secondary" : "default"}
                onClick={handleAddToCart}
                className="gap-1.5"
              >
                {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                {added ? "Added" : "Add to cart"}
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

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}
