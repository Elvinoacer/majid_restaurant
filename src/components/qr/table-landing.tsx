"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Utensils, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { toast } from "sonner";

type Props = {
  slug: string;
  tableId: string;
  tableLabel: string;
  restaurantName: string;
};

/**
 * QR-scanned table landing page (PRD §5.24).
 *
 * Customer scans the QR code on their physical table → lands here. We:
 *   1. Stash the tableId + label in the cart store (so checkout knows it).
 *   2. Show a brief confirmation ("Table 4 — order from here").
 *   3. Send them to the menu.
 *
 * Customer can also manually browse back here to confirm/clear the table
 * binding if they want to switch tables (rare, but possible).
 */
export function TableLanding({ slug, tableId, tableLabel, restaurantName }: Props) {
  const router = useRouter();
  const setTable = useCart((s) => s.setTable);
  const clearTable = useCart((s) => s.clearTable);
  const setRestaurantSlug = useCart((s) => s.setRestaurantSlug);
  // Read the current cart binding — when it matches, we know the binding
  // was applied and we can show the menu CTA. This avoids calling setState
  // synchronously inside useEffect (which the linter correctly flags as a
  // cascading-render anti-pattern).
  const boundTableId = useCart((s) => s.tableId);
  const boundTableLabel = useCart((s) => s.tableLabel);
  const saved = boundTableId === tableId && boundTableLabel === tableLabel;

  useEffect(() => {
    // Set the cart's tenant + table binding on mount.
    setRestaurantSlug(slug);
    setTable(tableId, tableLabel);
  }, [slug, tableId, tableLabel, setRestaurantSlug, setTable]);

  const goToMenu = () => {
    router.push(`/${slug}/menu`);
  };

  const goToCheckout = () => {
    router.push(`/${slug}/checkout`);
  };

  const handleClearTable = () => {
    clearTable();
    toast.success("Table binding cleared. Browse the menu to start a new order.");
    router.push(`/${slug}/menu`);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <QrCode className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">{restaurantName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You scanned the QR code for
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-display text-base font-bold text-primary">
          <Utensils className="h-4 w-4" />
          {tableLabel}
        </p>

        {saved && (
          <p className="mt-4 text-xs text-green-700">
            ✓ Table confirmed. You can browse the menu and place a dine-in order.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" onClick={goToMenu} disabled={!saved}>
            {saved ? "View menu & order" : "Setting up…"}
          </Button>
          <Button size="sm" variant="outline" onClick={goToCheckout} disabled={!saved}>
            Go straight to checkout
          </Button>
        </div>

        <button
          onClick={handleClearTable}
          className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Wrong table? Clear binding.
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By placing an order, you agree to be contacted by {restaurantName} about
        your order. Cash or M-Pesa accepted.
      </p>
    </div>
  );
}
