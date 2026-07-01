# MajidOS — Restaurant Growth Platform

> **Phase 0 + Phase 1 deliverable** of the multi-tenant restaurant platform specified in `requirements.md` (PRD v1.0).
> Built by GTSS (Great Thumbs Software Solutions) for the Majid Restaurant pitch, on Path B (multi-tenant from the schema up).

---

## 1. What's in this build

Phase 0 (foundation) + Phase 1 (presence & menu) of the PRD — a real, demoable
web app that replaces "no website" with a genuinely good one for Majid
Restaurant, while keeping the schema multi-tenant so the second client is a
config entry, not a codebase fork.

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

## 11. Next Phase Preview (Phase 2)

When you're ready, Phase 2 will add (PRD §9 Phase 2):

- Online ordering with `Order` cart lifecycle (`DRAFT` → `PENDING_PAYMENT` →
  `CONFIRMED` → `PREPARING` → `READY` → `DELIVERED` / `COMPLETED`).
- M-Pesa Daraja STK Push with idempotent callback
  (`mpesaCheckoutRequestId` column already on `Order`).
- Table reservations against `RestaurantTable` (already seeded for Majid).
- Customer accounts via NextAuth v5 (Credentials + Google OAuth).
  `Customer`, `Account`, `Session` models already in schema.
- Customer reviews tied to completed orders.
- Catering inquiries (`CateringInquiry` model already in schema).
- Admin dashboard core — menu CRUD, order list, reservation calendar.

The data model and tenant-scope wrapper are already in place — Phase 2 is UI
and integration work, not a re-platform.

---

## 12. License & Credit

Built by **GTSS (Great Thumbs Software Solutions)** as a speculative pitch
build for Majid Restaurant, Nakuru. The codebase is a reusable multi-tenant
template — onboarding a second restaurant client is a content upload, not a
re-deploy.

PRD reference: `requirements.md` (in project root).
