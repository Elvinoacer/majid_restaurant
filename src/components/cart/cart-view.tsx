"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { formatKsh } from "@/lib/whatsapp/order";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/card";

/**
 * Cart page (PRD §5.4). Client-side view of the persisted cart store.
 *
 * The cart survives refresh via localStorage. On "Proceed to checkout" the
 * user goes to /<slug>/checkout where the Order is created in DRAFT status
 * via a Server Action.
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
      <Container size="narrow" className="py-12 sm:py-20">
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Your cart is empty"
          description="Browse the menu and add a few things — your cart will show up here."
          action={
            <Button asChild>
              <Link href={`/${slug}/menu`}>Browse menu</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container size="narrow" className="py-6 sm:py-10">
      <PageHeader
        title="Your cart"
        subtitle={`${count} item${count === 1 ? "" : "s"} ready to order`}
        actions={
          <button
            onClick={clear}
            className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
          >
            Clear all
          </button>
        }
      />

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card elevation-1">
        {lines.map((line) => (
          <li
            key={line.menuItemId}
            className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
          >
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
              {line.imageUrl && (
                <Image
                  src={line.imageUrl}
                  alt={line.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="truncate font-medium text-foreground">{line.name}</h3>
              <p className="text-sm text-muted-foreground">
                KSh {formatKsh(line.unitPrice)} each
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center rounded-lg border border-border bg-background">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-l-lg text-foreground transition-colors hover:bg-accent/10 disabled:opacity-40"
                    onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}
                    disabled={line.quantity <= 1}
                    aria-label="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span
                    className="w-9 text-center text-sm font-semibold tabular-nums"
                    aria-label={`Quantity ${line.quantity}`}
                  >
                    {line.quantity}
                  </span>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-r-lg text-foreground transition-colors hover:bg-accent/10"
                    onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}
                    aria-label="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeLine(line.menuItemId)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger-muted hover:text-danger"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-bold tabular-nums text-foreground">
                KSh {formatKsh(line.unitPrice * line.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <PremiumCard className="mt-5 flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {count} item{count === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            <span className="text-sm font-normal text-muted-foreground">KSh </span>
            {formatKsh(total)}
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href={`/${slug}/checkout`}>
            Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PremiumCard>
    </Container>
  );
}
