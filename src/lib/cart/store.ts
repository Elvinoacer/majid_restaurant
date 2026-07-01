/**
 * Cart store (PRD §5.4 — Online Ordering).
 *
 * Phase 2 uses a hybrid approach:
 *   - Client-side cart state via Zustand (persisted to localStorage for
 *     refresh-survival across tabs on the same device).
 *   - On checkout, the cart is sent to a Server Action which creates an
 *     `Order` in `DRAFT` status. Per PRD: "Cart persists in a Server
 *     Action-backed Order in DRAFT status, not client-only state — survives
 *     refresh, works across devices if logged in."
 *
 * For guest checkout the DRAFT order is created at checkout time, not on
 * every cart mutation — this avoids creating hundreds of DRAFT rows per
 * customer session. For logged-in customers, a future optimization is to
 * persist the draft order to the DB on each mutation and rehydrate on
 * login from another device. Phase 2 ships the simpler guest-friendly flow.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
};

type CartState = {
  lines: CartLine[];
  restaurantSlug: string | null; // prevents cart bleed between tenants
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeLine: (menuItemId: string) => void;
  clear: () => void;
  setRestaurantSlug: (slug: string) => void;
  total: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      restaurantSlug: null,

      addLine: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.menuItemId === line.menuItemId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.menuItemId === line.menuItemId
                  ? { ...l, quantity: l.quantity + quantity }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity }] };
        }),

      setQuantity: (menuItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { lines: state.lines.filter((l) => l.menuItemId !== menuItemId) };
          }
          return {
            lines: state.lines.map((l) =>
              l.menuItemId === menuItemId ? { ...l, quantity } : l,
            ),
          };
        }),

      removeLine: (menuItemId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.menuItemId !== menuItemId),
        })),

      clear: () => set({ lines: [] }),

      setRestaurantSlug: (slug) =>
        set((state) => {
          // If the user switches to a different tenant, dump the cart — you
          // can't carry items from Restaurant A's menu into Restaurant B's
          // checkout.
          if (state.restaurantSlug && state.restaurantSlug !== slug) {
            return { restaurantSlug: slug, lines: [] };
          }
          return { restaurantSlug: slug };
        }),

      total: () =>
        get().lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: "majidos-cart",
      version: 1,
    },
  ),
);
