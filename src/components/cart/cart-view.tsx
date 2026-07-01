"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";

/**
 * Cart page (PRD §5.4). Client-side view of the persisted cart store.
 *
 * The cart survives refresh via localStorage. On "Proceed to checkout" the
 * user goes to /<slug>/checkout where the Order is created in DRAFT status
 * via a Server Action (per PRD: "Cart persists in a Server Action-backed
 * Order in DRAFT status, not client-only state").
 */
export function CartView({ slug }: { slug: string }) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeLine = useCart((s) => s.removeLine);
  const clear = useCart((s) => s.clear);
  const total = useCart((s) => s.total());
  const count = useCart((s) => s.count());

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-20">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 font-display text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the menu and add a few things — your cart will show up here.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/${slug}/menu`}>Browse menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your cart</h1>
        <button
          onClick={clear}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
        >
          Clear all
        </button>
      </header>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {lines.map((line) => (
          <li key={line.menuItemId} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-20">
              {line.imageUrl && (
                 
                <img
                  src={line.imageUrl}
                  alt={line.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="truncate font-medium">{line.name}</h3>
              <p className="text-sm text-muted-foreground">
                KSh {formatKsh(line.unitPrice)} each
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center rounded-md border border-border">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center hover:bg-accent/10"
                    onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}
                    aria-label="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center hover:bg-accent/10"
                    onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}
                    aria-label="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeLine(line.menuItemId)}
                  className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">KSh {formatKsh(line.unitPrice * line.quantity)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {count} item{count === 1 ? "" : "s"}
          </p>
          <p className="font-display text-2xl font-bold">KSh {formatKsh(total)}</p>
        </div>
        <Button asChild size="lg" className="gap-1.5">
          <Link href={`/${slug}/checkout`}>
            Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
