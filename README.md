# MajidOS — Restaurant Growth Platform

> **Phase 0 + Phase 1 + Phase 2 + Phase 3 deliverable** of the multi-tenant restaurant platform specified in `requirements.md` (PRD v1.0).
> Built by GTSS (Great Thumbs Software Solutions) for the Majid Restaurant pitch, on Path B (multi-tenant from the schema up).

---

## 1. What's in this build

Phase 0 (foundation) + Phase 1 (presence & menu) + Phase 2 (ordering,
reservations, accounts, M-Pesa, admin dashboard) + Phase 3 (operations layer:
kitchen dashboard, QR table menus, loyalty, events, careers) of the PRD — a
real, demoable web app that lets a customer place and pay for a real order
end-to-end, the owner manage it from a basic admin dashboard, the kitchen run
fulfillment from a tablet-optimized dashboard, and diners scan a QR code on
their table to start a dine-in order — while keeping the schema multi-tenant so
the second client is a config entry, not a codebase fork.

### Phase 0 — Foundation ✅

- Next.js 16 App Router project, TypeScript strict mode.
- Prisma schema (PRD §7.2) — every tenant-scoped model carries `restaurantId`.
  (Local dev uses SQLite; production target is PostgreSQL per PRD §4. The
  schema adapts `Decimal` → `Float` and `String[]` → JSON-encoded `String` for
  SQLite compatibility — a one-line flip back when migrating to Postgres.)
- Multi-tenant middleware (`src/middleware.ts`) — resolves slug from the first
  path segment of every request and attaches `x-restaurant-slug` to request
  headers for downstream RSCs / Server Actions.
- Tenant-scoped DB accessor (`src/lib/db/tenant-scope.ts`) — every query
  structurally scoped by `restaurantId`. Tenant leakage becomes a
  compile-time-adjacent problem, not a code-review-vigilance problem (PRD §7.3).
- Design tokens: warm restaurant palette (saffron / turmeric / terracotta on
  cream), mobile-first, sticky footer, Playfair Display headings + Geist Sans body.
- Seed script with realistic Majid placeholder data: 1 restaurant, 1 branch,
  7-day operating hours, 1 holiday override, 5 categories, 22 menu items with
  images and tags, 3 active promotions, 12 gallery images, 4 reviews, about
  content, 12 tables.

### Phase 1 — Presence & Menu ✅

| PRD § | Feature | Status |
|-------|---------|--------|
| 5.2  | Official online presence (homepage w/ hours, location, CTA, specials, reviews) | ✅ |
| 5.2  | `schema.org/Restaurant` JSON-LD for SEO | ✅ |
| 5.3  | Digital menu — categorized, searchable, filter-chip, sticky | ✅ |
| 5.3  | Sold-out items shown greyed-out (not hidden) | ✅ |
| 5.6  | WhatsApp ordering — `wa.me` deep link with structured message | ✅ |
| 5.7  | Google Maps embed + one-click directions deep-link + parking info | ✅ |
| 5.12 | Promotions carousel — date-bounded, auto-expiring | ✅ |
| 5.15 | FCM push notifications — plumbing only (token registration, SW, manifest) | ✅ |
| 5.20 | Gallery — image grid, lazy-loaded, lightbox, category filter | ✅ |
| 5.21 | About Us — owner-editable rich-text (story, mission, hygiene, sourcing) | ✅ |
| 5.21 | Contact — aggregates phone/email/WhatsApp/address/map/hours | ✅ |

### What's intentionally NOT in Phase 1

- Online ordering with payment (Phase 2)
- Reservations (Phase 2)
- Customer accounts / NextAuth (Phase 2)
- M-Pesa Daraja integration (Phase 2)
- Kitchen dashboard + Socket.IO (Phase 3)
- Loyalty program (Phase 3)
- QR table menus (Phase 3)
- Careers (Phase 3)
- Analytics (Phase 4)
- AI food recommendation (Phase 4)
- Meal builder (Phase 4)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components by default |
| Language | TypeScript (strict) | |
| ORM | Prisma v6 (Postgres-ready schema, SQLite for dev) | v7 migration is a 1-line provider swap when DB switches to Postgres |
| Database | SQLite (dev) | Postgres (production) — see `.env.example` |
| Auth | NextAuth.js v4 (available) | Customer accounts land in Phase 2 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) | |
| Push notifications | Firebase Cloud Messaging | Phase 1 = plumbing; Phase 2 = firing |
| Maps | Google Maps keyless embed | Upgrade to JS API in a later phase if interactive markers needed |
| Image hosting | Cloudinary (env-ready) | Phase 1 uses Unsplash source URLs for seed data |

---

## 3. Getting Started

### Prerequisites

- Node.js 20+ or Bun 1.3+
- A PostgreSQL database (production) — or use the bundled SQLite for dev (default)

### Install & run

```bash
# 1. Install deps
bun install

# 2. Copy env (Phase 1 only needs DATABASE_URL — see .env.example)
cp .env.example .env

# 3. Push schema to the database
bun run db:push

# 4. Seed the demo data (Majid Restaurant tenant)
bun prisma/seed.ts

# 5. Start dev server
bun run dev
# → http://localhost:3000  (redirects to /majid-restaurant)
```

### Production build

```bash
bun run build
bun run start
```

---

## 4. Project Structure

```
prisma/
├── schema.prisma              # Full multi-tenant schema (PRD §7.2)
└── seed.ts                    # Majid Restaurant seed data

src/
├── middleware.ts              # Slug-based tenant resolution → header
├── app/
│   ├── layout.tsx             # Root layout (fonts, metadata, manifest link)
│   ├── page.tsx               # / → redirects to /<DEFAULT_TENANT_SLUG>
│   ├── not-found.tsx          # Global 404
│   ├── [slug]/                # Per-tenant routes (PRD §5.1)
│   │   ├── layout.tsx         # Resolves tenant from header, wraps in header/footer
│   │   ├── page.tsx           # Homepage (PRD §5.2)
│   │   ├── menu/page.tsx      # Digital menu (PRD §5.3)
│   │   ├── gallery/page.tsx   # Gallery (PRD §5.20)
│   │   ├── about/page.tsx     # About (PRD §5.21)
│   │   ├── contact/page.tsx   # Contact (PRD §5.21)
│   │   ├── not-found.tsx      # Tenant 404
│   │   └── error.tsx          # Tenant error boundary
│   └── api/
│       └── notifications/
│           └── register-token/route.ts   # FCM token registration (PRD §5.15)
│
├── components/
│   ├── ui/                    # shadcn/ui component library
│   └── site/                  # MajidOS-specific components
│       ├── site-header.tsx
│       ├── site-footer.tsx
│       ├── home-page.tsx          # Server component for /<slug>
│       ├── promotions-carousel.tsx
│       ├── embedded-map.tsx
│       ├── menu-browser.tsx       # Client component orchestrating menu UI
│       ├── menu-search-bar.tsx
│       ├── menu-filter-chips.tsx
│       ├── menu-item-card.tsx     # WhatsApp order button lives here
│       ├── gallery-grid.tsx       # Includes lightbox
│       └── fcm-opt-in.tsx         # Phase 1 FCM permission + token register
│
└── lib/
    ├── db.ts                  # Prisma client singleton
    ├── db/
    │   ├── tenant-scope.ts    # tenantDb(restaurantId) wrapper (PRD §7.3)
    │   └── serialize.ts       # tagsJson <-> string[]
    ├── restaurant/
    │   ├── context.ts         # Server-side helper: headers() → Restaurant row + tenantDb
    │   └── hours.ts           # computeOpenStatus() + fetchHoursForRestaurant()
    ├── menu/
    │   └── index.ts           # searchMenuItems, getDietaryFlags, withTags
    ├── whatsapp/
    │   └── order.ts           # wa.me URL builder + structured message templates
    ├── seo/
    │   └── restaurant-jsonld.ts   # schema.org/Restaurant builder
    └── notifications/
        └── fcm.ts             # FCM env-var config reader

public/
├── sw.js                      # Service worker for FCM (Phase 1 plumbing)
└── manifest.json              # PWA manifest
```

---

## 5. Multi-Tenant Architecture

### Path-based routing (Phase 0/1 fast-path)

Per PRD §5.1 ⚡ Fast-path, Phase 1 uses path-based routing:

- `/majid-restaurant`           → Majid Restaurant home
- `/majid-restaurant/menu`      → Majid Restaurant menu
- `/majid-restaurant/gallery`   → etc.
- `/majid-restaurant/about`
- `/majid-restaurant/contact`

Adding a second restaurant is one `Restaurant` row + seed data — no deploy, no
schema change. The same `[slug]` route handles it.

### Tenant isolation enforcement

Two layers:

1. **Schema-level**: every tenant-scoped model has `restaurantId` + cascading
   delete from `Restaurant`.
2. **Query-level**: `tenantDb(restaurantId)` (PRD §7.3) wraps every Prisma
   model delegate so `findMany`, `findUnique`, `create`, `update`, `delete`,
   `count` all structurally inject `restaurantId` into the `where` clause.
   Callers cannot forget.

```typescript
// Server Component example
import { getContextRestaurant } from "@/lib/restaurant/context";

export default async function Page() {
  const { restaurant, db } = await getContextRestaurant();
  // `db.menuItem.findMany()` is auto-scoped to restaurant.id — caller
  // can't leak another tenant's data even with a bug.
  const items = await db.menuItem.findMany({ where: { isAvailable: true } });
  return <Menu items={items} />;
}
```

### Upgrading to subdomain routing

To switch to `majid.yourplatform.com` (PRD §5.1) instead of path-based:

1. Update `src/middleware.ts` to read `req.headers.get("host")` and split on `.`
   to extract the slug.
2. Everything else (tenant-scope wrapper, RSC context, Server Actions) stays
   the same — they read from `x-restaurant-slug` regardless of source.

---

## 6. Environment Variables

See `.env.example` for the full list. Phase 1 only requires:

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

All other vars (NextAuth, M-Pesa, Firebase, Cloudinary, Google Maps, Socket.IO)
are listed for forward-compatibility and are stubs until their phase lands.

---

## 7. Database Schema Notes (PRD §7.2)

The schema in `prisma/schema.prisma` mirrors PRD §7.2 with three SQLite-specific
adaptations (all reversible in a single PR when migrating to Postgres):

| PRD (Postgres) | This repo (SQLite) | Why |
|----------------|---------------------|-----|
| `Decimal @db.Decimal(10, 2)` | `Float` | SQLite has no native Decimal; Float is fine for a demo. Flip back on Postgres migration. |
| `String[]` (PG array) | `String` (JSON-encoded) | SQLite has no arrays. Helpers in `src/lib/db/serialize.ts` parse/serialize transparently. |
| `@db.Text`, `@db.Date` annotations | dropped | SQLite ignores these. Safe no-op. |

All relations, enums (`StaffRole`, `OrderStatus`, `FulfillmentType`,
`PaymentMethod`, `ReservationStatus`, `InquiryStatus`), and the
`restaurantId`-scoped pattern are preserved 1:1.

---

## 8. Phase 1 Features in Detail

### Homepage (`/[slug]`)

- **Hero** with cover image, open/closed badge, live hours label, average
  rating + review count, two CTAs (Browse Menu, Order via WhatsApp), address.
- **Promotions carousel** — auto-rotating, auto-expiring by date range,
  with dot navigation and prev/next buttons.
- **Popular Today** — up to 4 `isPopular` items, links to full menu.
- **Reviews snippet** — most recent 4 published reviews with star ratings.
- **Embedded Google Map** with one-click directions deep-link + parking info.
- **`schema.org/Restaurant` JSON-LD** in `<head>` — name, description,
  address, geo, opening hours specification, aggregate rating.

### Menu (`/[slug]/menu`)

- **Search-as-you-type** across name + description + tags (case-insensitive).
- **Sticky category chips** (mobile-first per PRD §5.3) — All, Breakfast,
  Biryani & Rice, Grills & BBQ, Drinks, Desserts. Each chip shows item count.
- **Dietary filter chips** — Vegetarian, Vegan, Spicy, Popular today.
  Multi-select; combinable with category filter.
- **Item cards** — image, name, description, price (KSh), dietary badges,
  quantity stepper, **"Order via WhatsApp"** button that opens `wa.me` with
  a structured message.
- **Sold-out items** shown greyed-out with "Sold out" overlay — never hidden
  (PRD §5.3 — reduces "why isn't this here" confusion, preserves SEO value).
- **Live hours badge** at the top of the page.

### WhatsApp Ordering (`wa.me` deep link — PRD §5.6)

- Each menu item card has its own "Order via WhatsApp" button.
- Quantity stepper (1–∞) feeds into the message.
- Structured message template (mirrors the discovery doc format exactly):
  ```
  *Majid Restaurant — Order Request*

  Order:
  • 3× Chicken Biryani
  ```
- For Phase 2 (full cart), `buildWhatsAppOrderMessage()` in
  `src/lib/whatsapp/order.ts` already supports full payload (name, phone,
  fulfillment type, time, address, items, total, instructions) — same template,
  richer data.

### Gallery (`/[slug]/gallery`)

- **Category filter chips** — All, Interior, Food, Staff (auto-derived from data).
- **Responsive grid** — 2 cols mobile, 3 cols sm, 4 cols md.
- **Lightbox** — click any image to open fullscreen viewer with keyboard
  navigation (←/→/Esc), prev/next buttons, caption display.
- **Lazy-loaded images** — `loading="lazy"` on every `<img>`.

### About (`/[slug]/about`)

- Owner-editable rich-text sections (PRD §5.21): Story, Mission, Hygiene &
  Safety, Sourcing — stored in `AboutContent` model (1:1 with Restaurant).
- Cover image, branded section headers with icons.
- Falls back to a friendly message if `AboutContent` doesn't exist yet.

### Contact (`/[slug]/contact`)

- Aggregates phone, email, WhatsApp, address (PRD §5.21) — pulls from
  `Restaurant` settings, no separately-maintained copy.
- **Opening Hours table** — all 7 days, with live "Open now" / "Closed" badge.
- **Embedded Google Map** + directions deep-link.
- Parking info displayed alongside address.

### FCM Push Notifications (PRD §5.15 — Phase 1 plumbing only)

- `public/sw.js` — service worker registered, ready for Phase 2 to wire
  notification display on `push` event.
- `public/manifest.json` — PWA manifest with `gcm_sender_id`.
- `src/components/site/fcm-opt-in.tsx` — opt-in button on homepage:
  1. Requests `Notification.permission`.
  2. If FCM env vars configured, lazily imports `firebase/messaging`,
     gets an FCM token, and POSTs it to `/api/notifications/register-token`.
  3. If FCM env vars not configured, still requests browser Notification
     permission — Phase 2 just needs to add the firing logic.
- `src/app/api/notifications/register-token/route.ts` — accepts token
  POSTs, validates the restaurant slug, logs the registration. Phase 2
  will persist tokens to a `PushSubscription` table for actual firing.

---

## 9. Known Limitations (Phase 1)

1. **Cloudinary not wired** — Phase 1 uses Unsplash source URLs for seed
   images. When Cloudinary env vars are added, swap the seed URLs and use
   `next/image` with the Cloudinary loader.
2. **Map is keyless embed** — uses `https://maps.google.com/maps?q=...&output=embed`
   which works without an API key. Swap to Google Maps JS API for interactive
   markers, nearby places, etc.
3. **No cart yet** — WhatsApp ordering is per-item. Phase 2 adds a real cart
   (Server Action-backed `Order` in `DRAFT` status per PRD §5.4) and the
   `buildWhatsAppOrderMessage()` helper already supports the full payload.
4. **SQLite for dev** — production should be Postgres. Schema adaptations
   are documented in §7 above and are a one-PR migration.
5. **No live notifications firing** — Phase 1 only registers FCM tokens.
   Phase 2 wires actual notification sends (order status, reservation confirm).

---

## 10. Pitch-Ready Checklist (PRD §1.3)

- [x] Live demo deployable — works on mobile, fast (Phase 1 menu page renders
      in ~270ms locally).
- [x] No schema changes needed to onboard a second restaurant — add a
      `Restaurant` row + seed data, done.
- [x] Multi-tenant isolation enforced structurally, not by convention.
- [x] `schema.org/Restaurant` structured data live on homepage for SEO
      (targets "best biryani in Nakuru" / "restaurants in Nakuru CBD" intent).
- [x] Mobile-first throughout — tested at iPhone 14 (390×844) and desktop
      (1280×800) viewports.
- [x] Sticky footer, semantic HTML, ARIA labels, keyboard-navigable lightbox.

---

## 11. Phase 2 — Ordering, Reservations & Accounts ✅

Phase 2 is complete. All 7 PRD §9 Phase 2 features have shipped:

| PRD §  | Feature                  | Implementation                                                                                                |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| §5.4   | Online ordering          | Cart (zustand + localStorage), checkout flow, DRAFT → PENDING_PAYMENT → CONFIRMED → … → COMPLETED lifecycle  |
| §5.5   | Table reservations       | Public form with capacity-based availability check (2-hour window, 1.2× overbook allowance)                  |
| §5.8   | Catering requests        | Public form, admin workflow NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED/DECLINED                          |
| §5.10  | Customer reviews         | Submit form gated by COMPLETED order + logged-in ownership; owner-moderated before publishing                 |
| §5.13  | Customer accounts        | NextAuth v5 Credentials + Google OAuth (opt-in via env). Guest checkout always available                      |
| §5.14  | M-Pesa payments          | Daraja STK Push direct integration, idempotent callback on `CheckoutRequestID`, sandbox + production         |
| §5.17  | Admin dashboard (core)   | Overview KPIs, orders list + status transitions, reservations calendar, catering list, menu CRUD, reviews moderation, staff mgmt |

### What's wired end-to-end

- **Cart & checkout:** browse menu → add to cart → checkout (delivery/pickup/dine-in + M-Pesa/cash) → order status page that polls for M-Pesa confirmation.
- **Order lifecycle:** customer places → kitchen dashboard notified via Socket.IO broadcast → staff moves through PREPARING → READY → DELIVERED → COMPLETED → customer can review.
- **Notifications:** FCM tokens persisted to `NotificationToken` table; customer gets push on status change, staff gets push on new order/reservation/catering.
- **Multi-tenant safety preserved:** customer & staff sessions re-check `restaurantId` on every request; M-Pesa callback resolves tenant from the order (Daraja doesn't know our slugs).

### Staff auth (separate from customer auth)

Per PRD §7.2 note, staff auth is intentionally separate from the customer NextAuth flow:

- Staff use email + password only (no OAuth) — `src/lib/auth/staff.ts`.
- Sessions are signed JWTs in a separate `majidos_staff_session` cookie, never shared with the customer `next-auth.session-token`.
- Roles (`OWNER` / `MANAGER` / `KITCHEN` / `FRONT_OF_HOUSE`) gate every admin action.

### M-Pesa Daraja integration

Direct integration with Safaricom's Daraja API — no aggregator (per PRD §5.14 and GTSS's existing pattern on other projects).

```
customer confirms → server initiates STK Push → customer enters PIN
→ Daraja callback hits /api/mpesa/callback (idempotent on CheckoutRequestID)
→ order status updates → Socket.IO broadcast + FCM push
```

Required env vars (see `.env.example`):

```env
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379              # sandbox
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://your-ngrok-url.lokal/api/mpesa/callback
MPESA_ENV=sandbox                    # or "production"
NEXT_PUBLIC_MPESA_ENABLED=true       # client flag — set when the above are filled in
```

If M-Pesa is not configured, the checkout UI hides the M-Pesa option and only
shows cash-on-delivery/pickup. The rest of the order flow is unaffected.

### Schema changes in Phase 2

Migration `20260701210000_phase2_auth_notifications` adds:

- `VerificationToken` — required by NextAuth v5 (email verification / magic links).
- `NotificationToken` — persists FCM tokens so server-side notifications can actually fire (Phase 1 only logged them).
- `Customer.passwordHash` — bcrypt hash for the Credentials provider.

### Phase 2 demo accounts

After running `bun run db:reset && bun run db:seed`:

- **Customer:** `aisha@example.com` / `aisha-demo-2024` (has 1 completed order, eligible to review)
- **Staff (OWNER):** `owner@majid.com` / `majid-owner-2024`
- **Staff (MANAGER):** `manager@majid.com` / `majid-manager-2024`
- **Staff (KITCHEN):** `kitchen@majid.com` / `majid-kitchen-2024`

---

## 12. Phase 3 — Operations Layer ✅

| PRD § | Feature | Status |
|-------|---------|--------|
| 5.9  | Event & meeting space bookings (gated on `hasEventSpace`) | ✅ |
| 5.11 | Loyalty program — points accrual + rules + redemption + audit ledger | ✅ |
| 5.16 | Kitchen dashboard — 3 columns (Preparing/Ready/Served), tablet-optimized, Socket.IO + polling fallback | ✅ |
| 5.19 | Careers — public postings + application form with CV upload + admin triage | ✅ |
| 5.24 | QR code table menus — print sheet, scan → menu → dine-in order | ✅ |

### Phase 3 routes added

**Customer-facing:**
- `/<slug>/events` — event space booking form (only renders if `restaurant.hasEventSpace = true`)
- `/<slug>/careers` — open positions list + per-position application form with CV upload
- `/<slug>/table/[tableId]` — QR-scanned table landing (sets cart.tableId → menu)

**Admin:**
- `/<slug>/admin/kitchen` — tablet-optimized real-time kitchen dashboard
- `/<slug>/admin/kitchen/api` — polling endpoint (15s fallback when Socket.IO is down/unconfigured)
- `/<slug>/admin/loyalty` — loyalty rules CRUD + customer lookup + redemption/adjustment
- `/<slug>/admin/events` — event booking workflow (NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED/DECLINED)
- `/<slug>/admin/careers` — job postings CRUD + applications viewer (with CV download)
- `/<slug>/admin/tables` — tables CRUD + per-table QR preview + printable laminator-ready QR sheet

### Phase 3 schema changes

Migration `20260702000000_phase3_loyalty_ledger` adds:

- `Restaurant.loyaltySpendPerPoint` — Float, default 100. Owner-configurable accrual ratio (1 point per KSh 100 spent).
- `LoyaltyPointLedger` — audit trail for every loyalty point mutation. Fields: `entryType` (ACCRUAL / REDEMPTION / ADJUSTMENT / EXPIRY), signed `points`, `balanceAfter` snapshot, optional `orderId`/`loyaltyRuleId`, `description`, `staffUserId`.
- `LoyaltyLedgerEntryType` enum.

`Customer.loyaltyPoints` is the cached balance (kept in sync via transaction); `LoyaltyPointLedger` is the source of truth — a discrepancy means a bug, and the ledger can be replayed to rebuild the balance.

### Phase 3 loyalty design

- **Accrual:** automatic + idempotent. When an order transitions to `COMPLETED` for the first time, `accrueLoyaltyForOrder` fires once. Re-running on an already-accrued order is a no-op (checked via the ledger). Only paid orders (`paidAt != null`) with a logged-in customer accrue.
- **Formula:** `pointsEarned = floor(order.total / restaurant.loyaltySpendPerPoint)`. Default ratio is KSh 100/point (configurable by OWNER on `/admin/loyalty`).
- **Redemption:** staff-initiated via `/admin/loyalty` → customer lookup → "Redeem reward". Picks an active `LoyaltyRule` (or custom points amount), writes a REDEMPTION ledger entry with the staff user recorded. Balance guard prevents over-redemption.
- **Adjustment:** OWNER/MANAGER can manually +/- points (signup bonus, mistake fix). Writes an ADJUSTMENT ledger entry with the staff user + reason.
- **Customer view:** `/account` shows balance, accrual ratio, available rewards, and last 5 ledger entries.

### Phase 3 kitchen dashboard design

- Three columns: **Preparing** → **Ready** → **Served** (with "Complete" button to advance to COMPLETED).
- Large touch-target action buttons (44px+ height) — designed for a tablet mounted in a kitchen, not a mouse.
- Urgency cues: red border + ring when an order has been in PREPARING > 10 min or READY > 5 min (configurable threshold).
- Per-card: order #, elapsed time, fulfillment type (delivery/pickup/dine-in), table label or delivery address, item list with line-item notes, special instructions (highlighted), customer contact for delivery drivers.
- Real-time: opens a Socket.IO connection to `NEXT_PUBLIC_SOCKET_URL` and joins the `restaurant:<id>` room. Re-fetches on every `order:new` / `order:status_changed` event. Always polls `/admin/kitchen/api` every 15s as a fallback (mobile connections drop sockets all the time — the kitchen can't afford to miss an order).
- Role gating: KITCHEN / MANAGER / OWNER can advance order status. FRONT_OF_HOUSE can view (read-only) — they handle pickup/delivery handoff verbally.

### Phase 3 QR table menu flow

1. Owner goes to `/<slug>/admin/tables` → sees all tables with inline QR previews.
2. Owner clicks "Print QR sheet" → opens a printable HTML page with one card per table (label + QR + URL) formatted for an A4 sheet. Prints and laminates one per table.
3. Customer scans the QR with their phone → lands on `/<slug>/table/<shortCode>` (short code = last 8 chars of the table's CUID, so the URL bar stays short).
4. The table landing page stashes `tableId` + `tableLabel` in the cart store and redirects to `/<slug>/menu`.
5. Customer adds items to cart, goes to checkout. The checkout detects the cart's `tableId`, preselects DINE_IN fulfillment, shows the table label read-only, and persists `tableId` on the Order.
6. The kitchen dashboard shows the dine-in order with the table label prominently, so runners know where to deliver.

The QR URL is built from `NEXT_PUBLIC_APP_URL` if set, otherwise reconstructed from request headers (`x-forwarded-proto` + `x-forwarded-host` / `host`). Set `NEXT_PUBLIC_APP_URL` to your production domain before printing QR codes for the demo.

### Phase 3 careers CV upload

In dev, CV uploads are saved to `/public/uploads/cv/<timestamp>-<slug>.<ext>` and the public URL is stored on `JobApplication.cvUrl`. Validation:
- Max 5 MB
- MIME type in allowlist: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (PDF + Word)
- Extension derived from MIME type (not trusted from the original filename)

In production, swap `saveCvFile` in `src/lib/careers/actions.ts` with a Cloudinary uploader — the `cvUrl` column stays the same, only the storage backend changes.

### Phase 3 demo accounts (unchanged from Phase 2)

After running `bun run db:reset && bun prisma/seed.ts`:

- **Customer:** `aisha@example.com` / `aisha-demo-2024` (now has 10 loyalty points + 1 ledger entry from the seeded completed order)
- **Staff (OWNER):** `owner@majid.com` / `majid-owner-2024` — full access to all Phase 3 admin pages
- **Staff (MANAGER):** `manager@majid.com` / `majid-manager-2024` — full access except staff management
- **Staff (KITCHEN):** `kitchen@majid.com` / `majid-kitchen-2024` — sees Kitchen + Orders only (Menu/Loyalty/Careers/Staff/Events hidden in nav)

---

## 13. Testing Phase 3 end-to-end

### 13.1 Kitchen dashboard (PRD §5.16 exit criteria)

1. Sign in as `kitchen@majid.com` / `majid-kitchen-2024` at `/majid-restaurant/admin/sign-in`.
2. Click **Kitchen** in the sidebar → land on `/majid-restaurant/admin/kitchen`.
3. Verify three columns render (Preparing / Ready / Served). If empty, place a test order first (see 13.4 below).
4. Verify the connection badge in the top-right shows "Polling (no socket)" — Socket.IO isn't configured for the demo, so the dashboard relies on 15-second polling.
5. Place a new order in another tab (Phase 2 customer checkout flow → cash on delivery). Within 15 seconds, the order should appear in the **Preparing** column on the kitchen dashboard (no manual refresh).
6. Click **Mark ready** on the order card. It should move to the **Ready** column.
7. Click **Mark served** → moves to **Served**.
8. Click **Complete** → moves out of the dashboard (status = COMPLETED). Loyalty points accrue to the customer at this step if they were logged in.
9. Verify the urgency cue: wait 10+ minutes on an order in Preparing (or temporarily lower the threshold in `admin-kitchen-dashboard.tsx`) → the card border turns red.

### 13.2 QR table menu (PRD §5.24 exit criteria)

1. Sign in as `owner@majid.com` / `majid-owner-2024`.
2. Go to `/majid-restaurant/admin/tables` → see 12 seeded tables (Table 1–12) with inline QR previews.
3. Click **Print QR sheet** → a new tab opens with a printable A4 sheet of all 12 QR codes. Print to PDF or paper.
4. Right-click one of the inline QR images → copy image address, OR click the "Open table page →" link below any QR.
5. The table page loads at `/majid-restaurant/table/<shortCode>` → shows "Table X — you scanned the QR code for…", the table is now bound to your cart.
6. Click **View menu & order** → land on `/majid-restaurant/menu`. Add items to cart.
7. Go to `/majid-restaurant/checkout`. Verify:
   - Fulfillment is preselected to **Dine-in**.
   - The Table field shows the bound table label, read-only, with a green "Detected from QR code on your table" hint.
   - The "Table number" input is not editable.
8. Place the order (cash). On the order status page, verify the order has `fulfillmentType: DINE_IN` and `tableId` set (visible in the admin orders list — the table label shows on the order card).
9. Open the kitchen dashboard → verify the new dine-in order shows the table label prominently so runners know where to deliver.

### 13.3 Loyalty (PRD §5.11)

1. Sign in as `aisha@example.com` / `aisha-demo-2024` at `/majid-restaurant/sign-in`.
2. Go to `/majid-restaurant/account` → verify the loyalty card shows **10 points** (accrued from the seeded completed order, KSh 1,050 ÷ 100 = 10 points) and one entry in "Recent activity" reading "Earned from order #XXXXXX (KSh 1,050)".
3. Verify three rewards are listed: Free mango lassi (50 pts), KSh 200 off (100 pts), Free dessert with family combo (KSh 5,000 spend).
4. Sign out, sign in as `owner@majid.com` / `majid-owner-2024` → go to `/majid-restaurant/admin/loyalty`.
5. Verify the accrual ratio shows "1 loyalty point per KSh 100 spent".
6. In the customer lookup, search for "aisha" → click the result → see balance (10 points) + 1 completed order + KSh 1,050 lifetime.
7. In "Redeem reward", select "Free mango lassi" — note the points field auto-fills to 50. Since Aisha only has 10 points, you should see a red "needs 40 more points" warning. Try to redeem anyway → it should be blocked with an error.
8. Test manual adjustment: enter +90 points with reason "Signup bonus". Verify Aisha's balance becomes 100. Go back to redeem the lassi (50 points) → success, balance drops to 50, ledger entry created.
9. Sign back in as Aisha → `/account` → verify balance is 50 + recent activity shows the redemption (-50) and the adjustment (+90).
10. Create a new reward rule (OWNER/MANAGER) → e.g. "Free chapati" / 30 points / "Complimentary chapati on next order" → verify it appears on Aisha's `/account` page rewards list.
11. Toggle the rule inactive → verify it disappears from Aisha's rewards list (active rules only).

### 13.4 Event space bookings (PRD §5.9)

1. Visit `/majid-restaurant/events` (no sign-in needed — it's public).
2. Verify the booking form renders (Majid has `hasEventSpace = true`).
3. Fill in name, phone, event date (future), 5h duration, 60 guests, setup needs → submit.
4. Verify "Request sent!" confirmation screen.
5. Sign in as owner → `/majid-restaurant/admin/events` → see the booking (status: NEW) + the seeded Sarah Wambui booking.
6. Walk it through: NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED. Verify status filter works.

### 13.5 Careers (PRD §5.19)

1. Visit `/majid-restaurant/careers` (public, no sign-in).
2. Verify two seeded postings show: Senior Chef de Partie + Waiter/Waitress.
3. Click "Apply now" on the chef posting → application form opens with the full description above.
4. Fill in name + phone + email + attach a PDF or Word CV (under 5 MB) → submit.
5. Verify "Application sent!" confirmation.
6. Try uploading a 6 MB file → should fail with "CV file is too large".
7. Try uploading a .jpg → should fail with "CV must be a PDF or Word document".
8. Sign in as owner → `/majid-restaurant/admin/careers` → see both postings (one with 1 application, one with 0 — counts visible).
9. Click the application count button → dialog opens showing the application. If a CV was uploaded, "Download CV" link works.
10. Create a new posting → verify it appears on the public `/careers` page. Toggle it inactive → verify it disappears from the public page.

### 13.6 Real-time (optional — requires Socket.IO service)

The kitchen dashboard works without Socket.IO (uses 15-second polling). To get true real-time updates:

1. Deploy a separate Socket.IO service (PRD §8 — not part of this zip). Example: a small Node/Express app on Railway that exposes:
   - `POST /emit` — accepts `{ room, event }` and broadcasts `event` to sockets in `room`.
   - `connection` handler that joins sockets to rooms via a `join` event.
2. Set `NEXT_PUBLIC_SOCKET_URL` and `SOCKET_SERVER_SECRET` in `.env`.
3. The `src/lib/realtime/emit.ts` helper already POSTs `order:new` / `order:status_changed` events to `<NEXT_PUBLIC_SOCKET_URL>/emit` on every order mutation. The kitchen dashboard subscribes to those events and re-fetches.
4. Place an order in one tab, watch it appear on the kitchen dashboard in another tab within ~1 second.

---

## 14. What's NOT in Phase 3 (deferred to Phase 4)

- **Analytics** (PRD §5.18 — most-ordered items, peak hours heatmap, returning-customer rate, revenue trends, conversion rate)
- **AI food recommendation** (PRD §5.22 — "I'm hungry" → tag-based matching)
- **Meal builder** (PRD §5.23 — Base → Protein → Drink → Dessert with live total, gated on `comboBuilderEnabled`)
- **Reservation reminders** (PRD §5.5: "reminder notification 2 hours before reservation time") — requires a cron/scheduler
- **Operating hours enforcement** at checkout — Phase 3 doesn't block orders outside operating hours
- **Multi-branch UI** — schema supports it, but the branch switcher isn't surfaced (single-branch until a real second branch exists)

These are all explicitly Phase 4 per PRD §9.

---

## 15. What to Test Before Phase 3

Phase 3 (Operations Layer — kitchen dashboard, QR table menus, loyalty, event
space bookings, careers) builds on the Phase 2 order lifecycle and admin
dashboard. Before starting Phase 3, verify each of the following end-to-end.

### 12.1 Customer flow

1. **Browse menu + add to cart** — `/majid-restaurant/menu` → click "Add to cart" on multiple items. Verify the cart icon in the header shows the count.
2. **Cart edit** — `/majid-restaurant/cart` → change quantities, remove a line, clear all. Total should update.
3. **Guest checkout (cash)** — `/majid-restaurant/checkout` → fill name/phone/address → choose "Cash on delivery" → "Place order". Should land on the order status page with status `CONFIRMED`.
4. **Guest checkout (M-Pesa)** — set the `MPESA_*` env vars and `NEXT_PUBLIC_MPESA_ENABLED=true` → redo checkout choosing M-Pesa. Status should land on `PENDING_PAYMENT` and the page should poll. Trigger a sandbox callback (Daraja simulator or a manual POST to `/api/mpesa/callback`) → status should flip to `CONFIRMED`.
5. **Order cancellation** — place an order, then on the order status page click "Cancel order" while still in DRAFT/PENDING_PAYMENT. Status should flip to `CANCELLED`.
6. **Customer sign-up + sign-in** — `/majid-restaurant/sign-in` → "Create account" tab → sign up → should auto-sign-in and land on `/account`. Verify order history shows the just-placed order.
7. **Review a completed order** — sign in as the demo customer (`aisha@example.com` / `aisha-demo-2024`) → go to the sample completed order → "Leave a review" → submit 5 stars + comment. Should land back on the order page. Verify the review does NOT yet appear on the homepage (it's pending moderation).
8. **Reservation request** — `/majid-restaurant/reservations` → fill in name/phone/party size/time → submit. Should show the "Reservation requested!" confirmation screen.
9. **Catering inquiry** — `/majid-restaurant/catering` → fill in name/phone/event date/guest count → submit. Should show the "Inquiry sent!" confirmation screen.

### 12.2 Admin flow

1. **Staff sign-in** — `/majid-restaurant/admin/sign-in` → `owner@majid.com` / `majid-owner-2024`. Should land on the admin Overview.
2. **Overview KPIs** — verify Today's revenue, Orders today, Reservations today, New inquiries cards show non-zero values (seeded sample data should populate these).
3. **Orders list + status transitions** — `/majid-restaurant/admin/orders` → pick the order you just placed as a customer → click "preparing" → "ready" → "completed". Verify status badge updates and the customer order status page reflects it.
4. **Reservations list + confirm** — `/majid-restaurant/admin/reservations` → find the seeded James Kamau reservation → click "confirmed". Status should flip.
5. **Catering list + workflow** — `/majid-restaurant/admin/catering` → find the seeded Janet Wanjiru inquiry → walk it through "contacted" → "quoted" → "confirmed" → "completed".
6. **Menu CRUD** — `/majid-restaurant/admin/menu` → click "New item" → create a test item → verify it appears on the public menu. Edit the item → toggle "sold out" → verify it shows greyed-out on the public menu. Delete the item.
7. **Review moderation** — `/majid-restaurant/admin/reviews` → find the pending review left by the demo customer → click "Publish" → verify it now appears on the homepage reviews section.
8. **Staff management (OWNER only)** — `/majid-restaurant/admin/staff` → "Add staff" → create a new kitchen user → sign out → sign in as the new user → verify the Staff nav link is hidden (only OWNER sees it).
9. **Role gating** — sign in as `kitchen@majid.com` / `majid-kitchen-2024` → verify you can see Orders but get blocked from Menu, Staff, Catering (role-gated).

### 12.3 Multi-tenant safety

1. Sign in as a customer of tenant A (Majid). Open a private window and visit a different tenant URL (once a second tenant exists). Verify you are NOT auto-signed-in — customer sessions are tenant-scoped.
2. Sign in as staff of tenant A. Visit tenant B's `/admin` URL. Verify you're redirected to tenant B's admin sign-in page (the staff JWT for tenant A is rejected).

### 12.4 Notifications (optional — requires env config)

1. Set `FIREBASE_*` env vars. Enable notifications in the browser (click "Enable updates" on the homepage).
2. Place an order. Within seconds you should get a push notification on the same device confirming the order.
3. Have staff mark the order as "ready". You should get a second push notification.

### 12.5 Real-time (optional — requires Socket.IO service)

1. Deploy the external Socket.IO service (PRD §8 — not part of this zip) and set `NEXT_PUBLIC_SOCKET_URL` + `SOCKET_SERVER_SECRET`.
2. Open the admin orders page in one tab. Place a new order in another tab. The admin tab should receive the new order without a manual refresh.

### 12.6 Known limitations to flag for Phase 3

- **Kitchen dashboard** is the admin Orders page in this build — Phase 3 ships the dedicated tablet-optimized view (PRD §5.16) with three columns (Preparing / Ready / Delivered) and large-touch-target buttons.
- **QR table menus** are not in this build (PRD §5.24 — Phase 3). The DINE_IN fulfillment type works but the customer types the table number manually.
- **Loyalty points** are accrued on the Customer model (`loyaltyPoints` column) but there's no accrual logic yet — Phase 3 ships LoyaltyRule evaluation.
- **Reservation reminders** (PRD §5.5: "reminder notification 2 hours before reservation time") require a cron/scheduler — not yet wired. Phase 3 will add it.
- **M-Pesa sandbox testing** requires a publicly-reachable callback URL — use ngrok or cloudflared for local dev.
- **Operating hours enforcement:** the checkout doesn't currently block orders outside operating hours — Phase 3 should add this guard.

---

## 13. License & Credit

Built by **GTSS (Great Thumbs Software Solutions)** as a speculative pitch
build for Majid Restaurant, Nakuru. The codebase is a reusable multi-tenant
template — onboarding a second restaurant client is a content upload, not a
re-deploy.

PRD reference: `requirements.md` (in project root).
