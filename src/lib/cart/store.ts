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
  tableId: string | null;        // Phase 3: set when customer scans a table QR
  tableLabel: string | null;     // human-readable, shown in checkout UI
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeLine: (menuItemId: string) => void;
  clear: () => void;
  setRestaurantSlug: (slug: string) => void;
  setTable: (tableId: string, label: string) => void;
  clearTable: () => void;
  total: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      restaurantSlug: null,
      tableId: null,
      tableLabel: null,

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

      clear: () => set({ lines: [], tableId: null, tableLabel: null }),

      setRestaurantSlug: (slug) =>
        set((state) => {
          // If the user switches to a different tenant, dump the cart — you
          // can't carry items from Restaurant A's menu into Restaurant B's
          // checkout. Also clear the table since it belongs to the old tenant.
          if (state.restaurantSlug && state.restaurantSlug !== slug) {
            return { restaurantSlug: slug, lines: [], tableId: null, tableLabel: null };
          }
          return { restaurantSlug: slug };
        }),

      setTable: (tableId, label) => set({ tableId, tableLabel: label }),

      clearTable: () => set({ tableId: null, tableLabel: null }),

      total: () =>
        get().lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: "majidos-cart",
      version: 3,
      // Bump version + migrate whenever CartLine changes shape. v3 keeps
      // the existing structure but the `clear()` semantics changed to
      // also reset `tableId`/`tableLabel` — old persisted carts may carry
      // a stale tableId from a previous dine-in session, so we drop them
      // on hydrate.
      migrate: (persisted: unknown) => {
        if (!persisted || typeof persisted !== "object") {
          return { lines: [], restaurantSlug: null, tableId: null, tableLabel: null };
        }
        const p = persisted as Partial<CartState> & { lines?: CartLine[] };
        return {
          lines: Array.isArray(p.lines) ? p.lines : [],
          restaurantSlug: p.restaurantSlug ?? null,
          // Always drop table assignment on hydrate — a stale tableId
          // from a previous session would silently make the next order
          // a dine-in order for that table.
          tableId: null,
          tableLabel: null,
        };
      },
    },
  ),
);
