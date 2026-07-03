# MajidOS — Comprehensive Testing Guide

> **Project:** Majid Restaurant Clone (`majid_restaurant_clone`) — a multi-tenant restaurant growth platform built with Next.js 16 (App Router), Prisma, TypeScript, Tailwind CSS 4 + shadcn/ui.
>
> **Purpose of this document:** A exhaustive, step-by-step QA manual that covers **every feature that has been implemented in the project** — what it does, **why it exists / how it helps the business**, how to **test it manually**, and what to **expect** when it works (and when it fails).
>
> **Scope:** Phases 0 → 4 (Foundation, Presence & Menu, Ordering & Reservations & Accounts, Operations Layer, Intelligence Layer). 40+ individual feature sections organized into 11 testing modules.

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Module A — Foundation & Multi-Tenant Safety (Phase 0)](#module-a--foundation--multi-tenant-safety-phase-0)
3. [Module B — Customer Presence & Menu (Phase 1)](#module-b--customer-presence--menu-phase-1)
4. [Module C — Ordering & Cart (Phase 2)](#module-c--ordering--cart-phase-2)
5. [Module D — Reservations, Catering, Events, Careers (Phase 2 + 3)](#module-d--reservations-catering-events-careers-phase-2--3)
6. [Module E — Customer Accounts, Reviews, Loyalty (Phase 2 + 3)](#module-e--customer-accounts-reviews-loyalty-phase-2--3)
7. [Module F — M-Pesa Daraja Payments (Phase 2)](#module-f--m-pesa-daraja-payments-phase-2)
8. [Module G — Notifications & Real-Time (Phase 2 + 3)](#module-g--notifications--real-time-phase-2--3)
9. [Module H — Admin Dashboard & Staff Management (Phase 2 + 3)](#module-h--admin-dashboard--staff-management-phase-2--3)
10. [Module I — Kitchen Dashboard & QR Table Menus (Phase 3)](#module-i--kitchen-dashboard--qr-table-menus-phase-3)
11. [Module J — Intelligence Layer: Analytics, AI Recommender, Meal Builder (Phase 4)](#module-j--intelligence-layer-analytics-ai-recommender-meal-builder-phase-4)
12. [Module K — Cross-Cutting: Error Boundaries, SEO, PWA, Service Worker](#module-k--cross-cutting-error-boundaries-seo-pwa-service-worker)
13. [End-to-End User Journeys](#end-to-end-user-journeys)
14. [Negative & Edge-Case Test Matrix](#negative--edge-case-test-matrix)
15. [Known Limitations & What's Intentionally NOT Implemented](#known-limitations--whats-intentionally-not-implemented)

---

## 1. Test Environment Setup

Before any feature can be tested, the project must be running locally with a seeded database. The seed script populates a realistic Majid Restaurant tenant with categories, 22 menu items, 12 tables, promotions, gallery images, demo customers, ~150 historical orders, and analytics events.

### 1.1 Prerequisites

- **Node.js 20+** or **Bun 1.3+**
- **Git** (to read source if needed)
- A modern browser (Chrome / Firefox / Safari / Edge)
- *(Optional, for advanced tests)* **ngrok** or **cloudflared** for M-Pesa callback testing
- *(Optional, for advanced tests)* A separate Socket.IO service deployed somewhere reachable

### 1.2 Install & seed

```bash
# from project root (majid_restaurant_clone/)
bun install
cp .env.example .env                 # only DATABASE_URL is strictly required
bun run db:push                      # applies schema to SQLite
bun prisma/seed.ts                   # populates demo data
bun run dev                          # starts Next.js dev server
# → http://localhost:3000  (auto-redirects to /majid-restaurant)
```

### 1.3 Demo accounts (after seeding)

| Role                  | Email                       | Password              |
| --------------------- | --------------------------- | --------------------- |
| Customer (with 10 loyalty pts + 1 completed order) | `aisha@example.com` | `aisha-demo-2024`     |
| Staff — OWNER         | `owner@majid.com`           | `majid-owner-2024`    |
| Staff — MANAGER       | `manager@majid.com`         | `majid-manager-2024`  |
| Staff — KITCHEN       | `kitchen@majid.com`         | `majid-kitchen-2024`  |

### 1.4 Optional env vars per feature

| Variable(s)                                  | Required to test                                       |
| -------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                               | Everything                                              |
| `MPESA_*` (5 vars) + `NEXT_PUBLIC_MPESA_ENABLED=true` | M-Pesa STK Push + callback                  |
| `NEXT_PUBLIC_SOCKET_URL` + `SOCKET_SERVER_SECRET` | Real-time kitchen dashboard (without it, polling fallback still works) |
| `FIREBASE_*` + `NEXT_PUBLIC_FIREBASE_*`      | FCM push notifications firing                          |
| `NEXT_PUBLIC_APP_URL`                        | Correct QR-code URLs printed on the table sheet        |
| `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`      | Google OAuth customer sign-in                          |

> **Tip:** Most features work end-to-end with only `DATABASE_URL` set. The optional vars unlock real-time, push, and payment subsystems that have graceful no-op fallbacks when missing — those fallbacks are themselves testable behaviours.

### 1.5 How to read each feature section

Each feature follows this template:

> **Feature name** — `route` or `file`
> **What it is** — one-sentence description.
> **Why it exists / business relevance** — the problem it solves for the restaurant.
> **Pre-conditions** — accounts / env / data needed before testing.
> **How to test** — numbered steps.
> **Expected result** — what the tester should see.
> **Failure signs** — what it looks like when it's broken.

---

## Module A — Foundation & Multi-Tenant Safety (Phase 0)

These features aren't tied to a single page — they are the substrate the whole app sits on. Test them by visiting any route.

### A1. Multi-tenant path-based routing

`src/proxy.ts`, `src/lib/restaurant/context.ts`

**What it is.** Every URL is namespaced under a tenant slug — e.g. `/majid-restaurant/menu`. The proxy extracts that first segment and injects `x-restaurant-slug` into request headers, which every Server Component and Server Action reads.

**Why it exists.** The platform is built to host multiple restaurant clients on one codebase. Adding a second restaurant is a database row, not a deploy. Path-based routing is the Phase-1 fast path; the schema already supports a switch to subdomain routing (`majid.yourplatform.com`) by editing only the proxy.

**How to test**

1. Visit `http://localhost:3000/` — the root should redirect to `/majid-restaurant` (the `DEFAULT_TENANT_SLUG`).
2. Visit `http://localhost:3000/majid-restaurant` — homepage loads.
3. Visit `http://localhost:3000/nonexistent-restaurant` — the tenant layout calls `notFound()` and the tenant 404 page renders.
4. Visit `http://localhost:3000/majid-restaurant/menu` — menu loads with Majid's items.

**Expected result.** `/` redirects. Known slug renders. Unknown slug 404s with the branded tenant not-found page (not the root 404).

**Failure signs.** Generic Next.js 404 on unknown slug (means tenant not-found.tsx missing); redirect loop on `/` (means `DEFAULT_TENANT_SLUG` not set or proxy matcher wrong).

---

### A2. Structural tenant isolation (tenant-scope wrapper)

`src/lib/db/tenant-scope.ts`

**What it is.** A `tenantDb(restaurantId)` wrapper around Prisma's model delegates that auto-injects `restaurantId` into every `findMany`, `findUnique`, `create`, `update`, `delete`, and `count` call. Server components and actions call `getContextRestaurant()` which returns `{ restaurant, db }` — the `db` is already scoped.

**Why it exists.** Convention-based isolation ("always remember the WHERE clause") fails at scale. Structural isolation makes tenant leakage a compile-time-adjacent problem — the only way to leak is to bypass the wrapper, which is a code-review flag.

**How to test**

1. Sign in as OWNER at `/majid-restaurant/admin/sign-in`.
2. Visit `/majid-restaurant/admin/orders` — you see Majid's orders only.
3. *(Future)* Seed a second restaurant and visit its admin pages — you should never see Majid's orders, reservations, or customers bleeding through.
4. Inspect any server action in `src/lib/orders/actions.ts` — note `const { db } = await getContextRestaurant()` and that every query goes through `db.order.findMany(...)` (no raw `prisma.order.findMany`).

**Expected result.** Switching tenants changes all visible data; no cross-tenant rows appear.

**Failure signs.** Same orders visible across tenants; `prisma.*` calls bypassing `db.*` in code.

---

### A3. Prisma schema & migrations

`prisma/schema.prisma`, `prisma/migrations/`

**What it is.** A 627-line multi-tenant schema covering Restaurant, Branch, OperatingHours, OperatingHoursOverride, StaffUser, Customer, Account, Session, VerificationToken, NotificationToken, MenuCategory, MenuItem, Order, OrderItem, RestaurantTable, Reservation, CateringInquiry, EventBooking, Review, Promotion, LoyaltyRule, LoyaltyPointLedger, GalleryImage, JobPosting, JobApplication, AboutContent, AnalyticsEvent. Five enums (StaffRole, OrderStatus, FulfillmentType, PaymentMethod, ReservationStatus, InquiryStatus, LoyaltyLedgerEntryType, AnalyticsEventType).

**Why it exists.** One schema = one source of truth. The schema is Postgres-ready; local dev uses SQLite with three documented adaptations (`Decimal → Float`, `String[] → JSON-encoded String`, dropped `@db.*` annotations).

**How to test**

1. Run `bun run db:push` — should succeed without errors.
2. Open `prisma/schema.prisma` — verify every tenant-scoped model has `restaurantId String` and `restaurant Restaurant @relation(...)`.
3. Run `bun prisma/seed.ts` — should complete with summary "Seeded Majid Restaurant tenant with: 1 restaurant, 1 branch, 7-day hours, 1 holiday override, 5 categories, 22 menu items, 3 promotions, 12 gallery images, 4 reviews, about content, 12 tables, 4 staff, 6 customers, ~150 historical orders, 220 analytics events".

**Expected result.** Schema pushes cleanly; seed completes; data is visible in the running app.

**Failure signs.** Migration drift errors; missing relations in Prisma client; `Unknown argument restaurantId` errors (means schema not pushed).

---

### A4. Design system & PWA manifest

`src/app/globals.css`, `public/manifest.json`, `public/sw.js`, `src/app/layout.tsx`

**What it is.** Tailwind CSS 4 with shadcn/ui (New York variant). Warm restaurant palette (saffron / turmeric / terracotta on cream). Playfair Display headings + Geist Sans body. PWA manifest + service worker for FCM.

**Why it exists.** A restaurant site is judged on first visual impression. The design tokens are tuned to feel like a Nakuru mid-range restaurant, not a SaaS dashboard. The PWA manifest + service worker lay the groundwork for installability and push notifications.

**How to test**

1. Open `http://localhost:3000/majid-restaurant` on desktop and on a mobile-width viewport (Chrome DevTools → iPhone 14 at 390×844).
2. Verify the hero uses serif headings, the body uses sans, and the colour palette is warm (amber/saffron accents, cream background).
3. Open Chrome DevTools → Application → Manifest — verify `name: "MajidOS"`, `display: "standalone"`, icons are listed.
4. Open Application → Service Workers — verify `sw.js` is registered and active.

**Expected result.** Mobile-first layout, no horizontal scroll on iPhone width. Manifest + SW registered.

**Failure signs.** Default Tailwind blue palette (design tokens not loaded); missing manifest link in `<head>`; SW in "redundant" state.

---

## Module B — Customer Presence & Menu (Phase 1)

### B1. Homepage — hero, hours badge, ratings, CTAs, map

`src/app/[slug]/page.tsx`, `src/components/site/home-page.tsx`

**What it is.** The landing page at `/<slug>`. Sections: hero (cover image, open/closed badge, live hours label, average rating + review count, two CTAs), features strip, promotions carousel, popular today grid, AI recommender (compact), reviews snippet, embedded Google Map.

**Why it exists.** PRD §5.2 — official online presence. This is the first impression for anyone searching "best biryani in Nakuru" or "restaurants in Nakuru CBD". A weak homepage loses the customer before they ever see the menu.

**How to test**

1. Visit `/majid-restaurant`.
2. Verify the hero shows: cover image, restaurant name + tagline, "Open now" or "Closed — opens…" badge, star rating with review count (e.g. "4.5 ★ from 4 reviews"), "Browse Menu" + "Order via WhatsApp" CTAs, address line.
3. Scroll — verify the promotions carousel auto-rotates, popular items grid (up to 4) appears, AI recommender compact section appears, reviews snippet (4 most recent published reviews) appears, embedded Google Map appears at the bottom.
4. Click "Browse Menu" — should navigate to `/majid-restaurant/menu`.
5. Click "Order via WhatsApp" — should open `wa.me` URL with a structured message in a new tab.

**Expected result.** All sections render with real seeded data. Hours badge reflects current time (test by changing your system clock if needed). CTAs navigate correctly.

**Failure signs.** Empty sections (data not seeded); "Open now" badge always shows regardless of time (hours logic broken); map iframe broken (keyless embed URL changed).

---

### B2. `schema.org/Restaurant` JSON-LD structured data

`src/lib/seo/restaurant-jsonld.ts`, `src/app/[slug]/page.tsx`

**What it is.** A JSON-LD `<script type="application/ld+json">` block in the homepage `<head>` describing the restaurant for search engines — name, description, address, geo coordinates, opening hours specification, aggregate rating, servesCuisine, priceRange.

**Why it exists.** PRD §5.2 — SEO. Rich snippets in Google search results (star ratings, hours, location) dramatically increase click-through. Without structured data, the restaurant is just another blue link.

**How to test**

1. Visit `/majid-restaurant`.
2. View page source (Ctrl+U) or use DevTools → Elements → `<head>`.
3. Search for `application/ld+json` — verify a script block exists with `@type: "Restaurant"`.
4. Validate the JSON-LD at https://search.google.com/test/rich-results — paste the homepage URL or the raw JSON-LD.

**Expected result.** Valid JSON-LD with all required `Restaurant` schema.org properties. Google's tool reports "Detected items: Restaurant" with no errors. Aggregate rating is computed from published reviews only.

**Failure signs.** Malformed JSON; missing `openingHoursSpecification`; aggregate rating present with zero published reviews (would be flagged by Google).

---

### B3. Digital menu — search, category chips, dietary filters, sold-out

`src/app/[slug]/menu/page.tsx`, `src/components/site/menu-browser.tsx`, `menu-search-bar.tsx`, `menu-filter-chips.tsx`, `menu-item-card.tsx`, `src/lib/menu/index.ts`

**What it is.** A searchable, filterable menu page. Sticky category chips (All / Breakfast / Biryani & Rice / Grills & BBQ / Drinks / Desserts) with per-chip counts. Dietary filter chips (Vegetarian / Vegan / Spicy / Popular). Search-as-you-type across name + description + tags. Item cards with image, dietary badges, price, quantity stepper, "Order via WhatsApp" button. Sold-out items shown greyed-out (never hidden).

**Why it exists.** PRD §5.3. The menu is the most-visited page on a restaurant site. Search + filters help a customer find what they want in seconds. Showing sold-out items (instead of hiding them) reduces "why isn't this here?" confusion and preserves SEO value — Google indexes the page expecting the item, the item still exists.

**How to test**

1. Visit `/majid-restaurant/menu`.
2. Verify the open-status pill at the top shows correct status (matches the homepage badge).
3. Click each category chip — the visible items change; the chip count matches the visible item count.
4. Click "Vegetarian" dietary chip — only vegetarian items show. Combine with a category chip — both filters apply (intersection).
5. Type "biryani" in the search bar — results filter as you type, case-insensitive. Try a tag like "spicy" — items with that tag match.
6. Find a sold-out item (or mark one in admin) — verify it appears greyed-out with a "Sold out" overlay and no "Order via WhatsApp" button (or a disabled state).
7. On each available item card, change the quantity stepper to 3, click "Order via WhatsApp" — verify a `wa.me` URL opens with a structured message listing 3× of that item.

**Expected result.** All filters work in combination. Search is instant. Sold-out items visible but unclickable. WhatsApp deep link carries quantity + item name.

**Failure signs.** Filters reset each other; search only matches name (should also match description + tags); sold-out items hidden entirely.

---

### B4. WhatsApp ordering deep link

`src/lib/whatsapp/order.ts`, `src/components/site/menu-item-card.tsx`

**What it is.** A `wa.me/<digits>?text=<encoded>` URL builder that opens WhatsApp with a structured order message pre-filled. Two flavours: `buildSingleItemWhatsAppMessage` (per-card, Phase 1) and `buildWhatsAppOrderMessage` (full cart payload, Phase 2).

**Why it exists.** PRD §5.6. Many Kenyan customers already order food via WhatsApp. Meeting them where they are (instead of forcing a sign-up flow) converts higher than asking them to create an account. The structured message saves the staff from re-typing "what does the customer want".

**How to test**

1. On the menu page, click "Order via WhatsApp" on an item card.
2. WhatsApp Web (or the WhatsApp app, if installed) opens with a message like:

   ```
   *Majid Restaurant — Order Request*

   Order:
   • 2× Chicken Biryani

   Reply to confirm. Asante!
   ```
3. Try changing the quantity on the card to 5 — the message updates to `5× Chicken Biryani`.
4. After Phase 2 testing (cart + checkout), verify the full-cart WhatsApp message includes name, phone, fulfillment type, address (or table), all line items, total, and special instructions.

**Expected result.** WhatsApp opens with a correctly-formatted message. Phone number in the URL matches `Restaurant.whatsappPhone` (E.164 format).

**Failure signs.** URL opens WhatsApp but message is empty (encoding bug); phone number has `+` prefix or spaces (would break `wa.me`); message lacks the bullet items.

---

### B5. Google Maps embed + one-click directions

`src/components/site/embedded-map.tsx`

**What it is.** A keyless Google Maps iframe (`https://maps.google.com/maps?q=...&output=embed`) plus a "Get directions" deep link (`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`) plus parking info.

**Why it exists.** PRD §5.7. A customer who can't find the restaurant doesn't become a customer. The map embed works without an API key (free); the directions deep-link opens Google Maps directly with the destination pre-filled — one tap from "I'm hungry" to "I'm driving there".

**How to test**

1. Visit `/majid-restaurant` — scroll to the bottom, verify the embedded map loads (no API key error).
2. Visit `/majid-restaurant/contact` — verify the map loads there too, plus parking info is shown alongside the address.
3. Click "Get directions" — opens Google Maps in a new tab with the restaurant's coordinates as the destination.

**Expected result.** Map renders without an API key. Directions deep link works on desktop (opens maps.google.com) and on mobile (offers to open the Maps app).

**Failure signs.** "For development purposes only" watermark on the map (means someone swapped to the JS API without a key); directions link missing or pointing to a wrong coordinate.

---

### B6. Promotions carousel — auto-expiring

`src/components/site/promotions-carousel.tsx`

**What it is.** An auto-rotating carousel of active promotions (only those whose `startDate ≤ now ≤ endDate` and `isActive = true`). Dot navigation + prev/next buttons.

**Why it exists.** PRD §5.12. Promotions drive repeat visits and off-peak orders. Auto-expiry means the owner doesn't have to remember to take down last week's special — the date range handles it.

**How to test**

1. Visit `/majid-restaurant` — the promotions carousel should auto-rotate every few seconds.
2. Click a dot — should jump to that slide.
3. Click prev/next arrows — should navigate manually.
4. In the database, set one promotion's `endDate` to yesterday — refresh the homepage — that promotion should no longer appear.
5. Set a promotion's `isActive = false` — refresh — should not appear.

**Expected result.** Only active, in-date-window promotions appear. Carousel rotates automatically and accepts manual navigation.

**Failure signs.** Expired promotions still showing (date check missing); carousel doesn't auto-rotate (timer bug); dots don't reflect current slide.

---

### B7. FCM push notifications — opt-in & token registration

`src/components/site/fcm-opt-in.tsx`, `src/app/api/notifications/register-token/route.ts`, `src/lib/notifications/fcm.ts`

**What it is.** A floating "Enable updates" button on the homepage hero. Requests `Notification.permission`; if FCM env vars are configured, lazily imports `firebase/messaging`, gets an FCM token, and POSTs it to `/api/notifications/register-token`. The API upserts the token (keyed on `(restaurantId, token)`) to the `NotificationToken` table, attaching the `customerId` from session (never from the request body).

**Why it exists.** PRD §5.15. Push notifications are how the restaurant reaches the customer without an SMS budget. "Your order is ready" / "Your reservation is confirmed" / "New special: 20% off biryani tonight" all flow through FCM. Phase 1 = plumbing only; Phase 2 = firing on order/reservation events.

**How to test**

1. Visit `/majid-restaurant` — verify a floating "Enable updates" button appears top-right of the hero.
2. Click it — browser prompts for notification permission. Allow.
3. If `FIREBASE_*` env vars are set:
   - The button should turn green / disabled state.
   - Check the database `NotificationToken` table — a new row should exist with the FCM token, your user-agent, and `customerId` null (you're a guest) or your customer ID (if signed in).
4. If `FIREBASE_*` env vars are NOT set:
   - The browser permission is still requested (Phase 2 will wire the firing).
   - No token is POSTed.
5. Try sending a fake `customerId` in the POST body to `/api/notifications/register-token` — verify the server ignores it and resolves `customerId` from session only.

**Expected result.** Permission flow works; token persisted when FCM configured; `customerId` resolution is server-authoritative.

**Failure signs.** Token POSTed with `customerId` from body (security bug — a malicious client could attach tokens to other customers); button doesn't disable after granting permission; FCM import errors swallow silently without surfacing to the user.

---

### B8. Gallery — grid, filter, lightbox

`src/app/[slug]/gallery/page.tsx`, `src/components/site/gallery-grid.tsx`

**What it is.** A responsive image grid (2 cols mobile, 3 cols sm, 4 cols md) with category filter chips (All / Interior / Food / Staff — auto-derived from data). Click any image to open a fullscreen lightbox with keyboard navigation (← / → / Esc) and prev/next buttons. Lazy-loaded images via `loading="lazy"`.

**Why it exists.** PRD §5.20. People eat with their eyes first. A gallery lets the restaurant show off its interior, signature dishes, and team. The lightbox matters because mobile users want to pinch-zoom food photos.

**How to test**

1. Visit `/majid-restaurant/gallery`.
2. Verify 12 seeded gallery images appear in a grid.
3. Click each category chip — the grid filters.
4. Click any image — lightbox opens fullscreen with the caption visible.
5. Press ← / → arrows — navigate between images.
6. Press Esc — lightbox closes.
7. Click prev/next buttons in the lightbox — navigate.
8. Open DevTools Network tab — verify images load lazily (only the visible ones initially).

**Expected result.** Filter works; lightbox opens; keyboard navigation works; lazy loading reduces initial network payload.

**Failure signs.** All images load at once (no `loading="lazy"`); lightbox opens but Esc doesn't close; arrow keys don't navigate.

---

### B9. About Us — owner-editable rich text

`src/app/[slug]/about/page.tsx`

**What it is.** A page rendering owner-editable rich-text sections: Story, Mission, Hygiene & Safety, Sourcing. Stored in the `AboutContent` model (1:1 with Restaurant). Falls back to a friendly "we're working on our story" message if no content exists.

**Why it exists.** PRD §5.21. Customers (especially tourists and corporate event planners) want to know who runs the restaurant. Hygiene & sourcing sections build trust post-COVID. Owner-editable means the restaurant doesn't need a developer to update its own story.

**How to test**

1. Visit `/majid-restaurant/about`.
2. Verify four sections render with seeded content: Story, Mission, Hygiene & Safety, Sourcing.
3. In the database, delete the `AboutContent` row for Majid — refresh — verify the friendly fallback message renders ("We're working on our story…").
4. Re-seed.

**Expected result.** All sections render when content exists; graceful fallback when it doesn't.

**Failure signs.** Page throws 500 when `AboutContent` is missing (means fallback missing); sections render in wrong order.

---

### B10. Contact — aggregated info + hours + map

`src/app/[slug]/contact/page.tsx`

**What it is.** Aggregates phone, email, WhatsApp, address, parking info from the `Restaurant` settings (no separately-maintained copy). Renders an opening hours table for all 7 days with a live "Open now" / "Closed" badge. Embeds the Google Map + directions deep-link.

**Why it exists.** PRD §5.21. The contact page is the second-most-visited page after the menu. Aggregating from `Restaurant` settings means there's one source of truth — the owner updates the phone number in one place and it propagates everywhere.

**How to test**

1. Visit `/majid-restaurant/contact`.
2. Verify phone, email, WhatsApp, address, parking info all match the seeded `Restaurant` row.
3. Verify the opening hours table shows 7 days with the correct open/close times.
4. Verify the live badge shows "Open now" or "Closed" matching the current time.
5. Click the phone number — `tel:` link should dial on mobile.
6. Click the email — `mailto:` should open the mail client.
7. Click "Get directions" — opens Google Maps with destination.

**Expected result.** All contact info matches seeded data; links work; hours table is complete; live badge reflects reality.

**Failure signs.** Phone number not clickable; hours table missing days; badge shows "Open now" outside operating hours.

---

## Module C — Ordering & Cart (Phase 2)

### C1. Cart — Zustand store, localStorage persistence, tenant sync

`src/lib/cart/store.ts`, `src/components/cart/cart-view.tsx`, `src/components/cart/cart-tenant-sync.tsx`

**What it is.** A client-side Zustand cart store persisted to `localStorage` under `majidos-cart` (v3). Exposes `lines`, `restaurantSlug`, `tableId`, `tableLabel`, `addLine`, `setQuantity`, `removeLine`, `clear`, `setRestaurantSlug`, `setTable`, `clearTable`, `total()`, `count()`. `CartTenantSync` is an invisible component mounted in the tenant layout that calls `setRestaurantSlug(slug)` on mount and whenever the slug changes — switching tenants clears the cart (prevents accidentally ordering from the wrong restaurant).

**Why it exists.** PRD §5.4. A cart is the bridge between "browsing" and "buying". Persisting to localStorage means a customer who closes the tab doesn't lose their selections. Tenant-scoping is critical — without it, a customer browsing two restaurants could check out with items from the wrong kitchen.

**How to test**

1. Visit `/majid-restaurant/menu`.
2. Click "Add to cart" on 3 different items — verify the cart icon in the header shows count "3".
3. Visit `/majid-restaurant/cart` — verify all 3 items appear with image, name, quantity stepper, line total, and a "Clear all" button.
4. Change a quantity — line total and subtotal update.
5. Remove a line — it disappears, subtotal updates.
6. Click "Clear all" — cart becomes empty, empty state shows.
7. Add items again, then refresh the page — cart should persist (localStorage).
8. Add items, then change the URL to a different tenant slug (e.g. `/other-restaurant/menu`) — the cart should clear (tenant sync).
9. Add items, then close the tab and reopen — cart should persist.

**Expected result.** Cart operations work; persistence survives refresh and tab close; tenant switch clears the cart.

**Failure signs.** Cart survives tenant switch (means `CartTenantSync` not mounted or `setRestaurantSlug` doesn't clear); cart loses items on refresh (localStorage migration broken); quantity steppers don't update subtotal.

---

### C2. Checkout — fulfillment, payment, validation

`src/app/[slug]/checkout/page.tsx`, `src/components/checkout/checkout-view.tsx`

**What it is.** The checkout form. Fields: fulfillment type (DELIVERY / PICKUP / DINE_IN), payment method (MPESA / CASH — MPESA only visible if `isMpesaConfiguredClient()`), guest name, guest phone, delivery address (required for DELIVERY), M-Pesa phone (required for MPESA), scheduled-for (optional), special instructions (optional). Calls `createOrderFromCart` then `submitOrder`.

**Why it exists.** PRD §5.4. This is where browsing becomes revenue. The form is intentionally simple — guest checkout always works (no forced sign-up). The DINE_IN + table-id auto-detection from the QR flow (tested in Module I) makes dine-in ordering frictionless.

**How to test**

1. Add items to cart, visit `/majid-restaurant/checkout`.
2. Try submitting with empty name — should fail validation.
3. Try submitting with empty phone — should fail validation.
4. Choose DELIVERY — address field should become required. Submit without address — should fail.
5. Choose PICKUP — address field should not be required.
6. Choose DINE_IN — table number field should appear.
7. If M-Pesa env vars are NOT set — the M-Pesa payment option should be hidden; only CASH visible.
8. If M-Pesa env vars ARE set — choose MPESA — M-Pesa phone field becomes required.
9. Submit a valid CASH order — should redirect to `/majid-restaurant/orders/<orderId>` with status `CONFIRMED`.
10. Submit a valid MPESA order — should redirect to `/majid-restaurant/orders/<orderId>?pending=mpesa` with status `PENDING_PAYMENT` (M-Pesa flow tested in Module F).

**Expected result.** Validation blocks incomplete submissions; fulfillment type changes required fields; payment option visibility depends on env config.

**Failure signs.** Submit succeeds with empty name (validation missing); MPESA option visible without env config; address required even for PICKUP.

---

### C3. Order lifecycle — DRAFT → PENDING_PAYMENT → CONFIRMED → PREPARING → READY → DELIVERED → COMPLETED

`src/lib/orders/actions.ts`

**What it is.** The Order state machine. `createOrderFromCart` creates a `DRAFT` order with authoritative server-side price snapshots. `submitOrder` moves it to `CONFIRMED` (CASH) or `PENDING_PAYMENT` (MPESA). Staff `updateOrderStatus` advances through `PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED`. On first transition to `COMPLETED`: loyalty accrues (idempotent), `order_completed` analytics event fires, FCM pushes customer, Socket.IO broadcasts.

**Why it exists.** PRD §5.4. A clear lifecycle means the customer always knows what's happening, the kitchen knows what to cook, and the runner knows what to deliver. Idempotent loyalty accrual prevents double-awarding if a staff member fat-fingers "Complete" twice.

**How to test**

1. Place a CASH order as a guest (Module C2 step 9).
2. Sign in as OWNER at `/majid-restaurant/admin/sign-in`.
3. Visit `/majid-restaurant/admin/orders` — find your order (status: CONFIRMED).
4. Click "preparing" — status badge updates to PREPARING.
5. Click "ready" — READY.
6. Click "out for delivery" (only relevant if DELIVERY) — OUT_FOR_DELIVERY.
7. Click "delivered" — DELIVERED.
8. Click "completed" — COMPLETED. At this point:
   - If the order had a logged-in customer, loyalty points accrue (verify in `/admin/loyalty` customer lookup or the customer's `/account` page).
   - An `order_completed` analytics event is recorded (verify in `/admin/analytics` conversion funnel after a few minutes).
9. Click "completed" again — should be a no-op (idempotent — no double loyalty accrual).

**Expected result.** Each transition updates the status badge in real time. Customer order-status page (open in another tab) reflects the change within 4 seconds (polling). Loyalty accrues exactly once.

**Failure signs.** Status transitions skip states; loyalty accrues twice on double-click; customer order-status page doesn't update (polling broken).

---

### C4. Order status page — live polling

`src/app/[slug]/orders/[orderId]/page.tsx`, `src/components/checkout/order-status-view.tsx`, `src/app/api/orders/[orderId]/route.ts`

**What it is.** A customer-facing page showing the current order status with icon, tone, description, items, totals, and a cancel button. Polls `GET /api/orders/[orderId]` every 4 seconds while the status is transitional (`PENDING_PAYMENT`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`). Stops polling on terminal statuses (`DELIVERED`, `COMPLETED`, `CANCELLED`). Reads `?pending=mpesa` query to show a "Please enter your M-Pesa PIN" hint.

**Why it exists.** PRD §5.4. The customer wants reassurance that their order is being handled. Polling (instead of WebSockets) is more reliable on flaky mobile networks — a dropped socket would leave them staring at a stale status. 4 seconds is fast enough to feel live but slow enough not to hammer the server.

**How to test**

1. Place an order, land on the order status page.
2. Open DevTools Network tab — verify a GET to `/api/orders/<orderId>` fires every 4 seconds.
3. Have staff advance the order through statuses (Module C3) — the customer page should update within ~4 seconds without a manual refresh.
4. Once the order reaches COMPLETED — verify polling stops (no more GETs).
5. While the order is still in DRAFT/PENDING_PAYMENT — click "Cancel order" — status should flip to CANCELLED.
6. Try cancelling after CONFIRMED — should be blocked with "Call the restaurant" message.

**Expected result.** Polling fires at 4s intervals; status updates appear without refresh; polling stops on terminal status; cancel works only pre-CONFIRMED.

**Failure signs.** Polling continues after COMPLETED (wastes battery); status updates require manual refresh; cancel succeeds after CONFIRMED (means guard missing).

---

### C5. Order cancellation

`src/lib/orders/actions.ts` — `cancelOrder(orderId)`

**What it is.** Customer-initiated cancellation. Only allowed while order is in `DRAFT` or `PENDING_PAYMENT`. After `CONFIRMED`, the customer must call the restaurant — the kitchen has started prepping.

**Why it exists.** PRD §5.4. A customer who changes their mind before the kitchen starts cooking should be able to cancel without a phone call. After that point, the restaurant has incurred costs — the customer needs to talk to a human.

**How to test**

1. Place an order, on the order-status page click "Cancel order" while status is `CONFIRMED` — should be blocked.
2. Place an M-Pesa order, while status is `PENDING_PAYMENT` — click "Cancel order" — should succeed, status becomes CANCELLED.
3. Verify the cancellation broadcasts `order:status_changed` (kitchen dashboard should reflect it if open).

**Expected result.** Cancellation blocked after CONFIRMED; allowed during PENDING_PAYMENT; status update propagates.

**Failure signs.** Cancellation allowed at any time (no guard); status doesn't update on kitchen dashboard.

---

## Module D — Reservations, Catering, Events, Careers (Phase 2 + 3)

### D1. Table reservations — capacity check

`src/app/[slug]/reservations/page.tsx`, `src/components/reservations/reservation-form.tsx`, `src/lib/reservations/actions.ts`

**What it is.** A public form: guest name, phone, party size, reserved-for (date + time), occasion, seating preference, notes. Server action `createReservation` validates future time and runs a ±2-hour availability check: total party size in the window must be ≤ `totalCapacity × 1.2` (overbook allowance). Creates reservation in `PENDING`. Staff confirm/seat/complete/cancel/no-show via `updateReservationStatus`.

**Why it exists.** PRD §5.5. Reservations let the restaurant plan staffing and table layout. The 1.2× overbook allowance (industry standard) compensates for typical no-show rates without turning away real customers. Seating preferences (window, quiet, outdoor) let the host plan the floor.

**How to test**

1. Visit `/majid-restaurant/reservations`.
2. Try submitting with a past date — should fail with "Please pick a future date".
3. Submit a valid reservation: name "Test User", phone "0712345678", party size 4, time = tomorrow 7pm, seating pref "Window". Should show "Reservation requested!" confirmation.
4. Sign in as OWNER → `/majid-restaurant/admin/reservations` — find your reservation (status: PENDING).
5. Click "confirmed" — status flips. If you were a logged-in customer with FCM enabled, you'd get a push.
6. Click "seated" → "completed" → try "no-show" on a fresh reservation.
7. Capacity test: create 4 reservations for the same 2-hour window, each for 6 guests. The 5th should be rejected if it would exceed capacity × 1.2.

**Expected result.** Past dates blocked; reservation creates in PENDING; staff workflow advances through statuses; capacity check prevents overbooking.

**Failure signs.** Past date accepted; capacity check missing (unlimited overbooking); seating preference not stored.

---

### D2. Catering inquiries — admin triage workflow

`src/app/[slug]/catering/page.tsx`, `src/components/catering/catering-form.tsx`, `src/lib/catering/actions.ts`

**What it is.** A public form: contact name, phone, email, event date, guest count, budget range, preferred cuisine, event type, notes. Creates inquiry in `NEW`. Staff workflow: `NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED` (or `DECLINED` at any stage).

**Why it exists.** PRD §5.8. Catering is high-ticket (often KSh 50k+ per event) but high-effort to coordinate. A structured inquiry form captures the info the chef needs to quote (guest count, cuisine, budget) without a phone tag. The workflow prevents inquiries from falling through the cracks.

**How to test**

1. Visit `/majid-restaurant/catering`.
2. Submit an inquiry: name "Test Catering", phone "0712345678", event date = next month, guest count 50, budget "50k-100k", cuisine "Swahili".
3. Verify "Inquiry sent!" confirmation.
4. Sign in as OWNER → `/majid-restaurant/admin/catering` — find your inquiry (status: NEW).
5. Click "contacted" → "quoted" → "confirmed" → "completed".
6. Submit another inquiry, then click "declined" — status should flip to DECLINED.

**Expected result.** Inquiry creates in NEW; staff workflow advances; all transitions persist.

**Failure signs.** Status transitions don't persist; DECLINED state missing; inquiry form accepts past event dates.

---

### D3. Event space bookings — feature-flagged

`src/app/[slug]/events/page.tsx`, `src/components/events/event-booking-form.tsx`, `src/lib/events/actions.ts`

**What it is.** A public form (only renders if `restaurant.hasEventSpace = true`): contact name, phone, event date, duration hours, guest count, setup needs. Creates booking in `NEW`. Same workflow as catering. Page calls `notFound()` (tenant 404) if the restaurant doesn't have an event space.

**Why it exists.** PRD §5.9. Event space is a separate revenue stream from catering — the customer is renting the venue, not just buying food. Gating on `hasEventSpace` means restaurants without an event space never show the link, avoiding confused customers.

**How to test**

1. Visit `/majid-restaurant/events` (Majid has `hasEventSpace = true`).
2. Verify the booking form renders.
3. Submit: name "Test Event", phone "0712345678", event date = next month, duration 5 hours, guest count 60, setup needs "Projector + tables".
4. Verify "Request sent!" confirmation.
5. Sign in as OWNER → `/majid-restaurant/admin/events` — find your booking (status: NEW) plus the seeded Sarah Wambui booking.
6. Walk it through NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED.
7. In the database, set `Restaurant.hasEventSpace = false` for Majid — refresh `/majid-restaurant/events` — should 404 with the tenant not-found page.
8. Re-set to true.

**Expected result.** Form renders when flag is on; 404s when flag is off; workflow advances correctly.

**Failure signs.** Form renders when flag is off (means `notFound()` missing); workflow stuck on NEW (status update action broken).

---

### D4. Careers — public postings + CV upload

`src/app/[slug]/careers/page.tsx`, `src/components/careers/careers-list.tsx`, `src/lib/careers/actions.ts`

**What it is.** Public page listing active job postings (seeded: Senior Chef de Partie + Waiter/Waitress). "Apply now" opens a per-position application form with the full description above. Fields: name, phone, email, CV file upload (optional). CV validation: max 5 MB; MIME type in allowlist (`application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`); extension derived from MIME type (not the original filename). Saved to `/public/uploads/cv/<timestamp>-<slug>.<ext>`.

**Why it exists.** PRD §5.19. Restaurant hiring is high-volume and CV-heavy. The structured application form lets the owner triage without a separate HR tool. CV MIME-validation (instead of trusting the file extension) prevents someone from uploading an `.exe` renamed to `.pdf`.

**How to test**

1. Visit `/majid-restaurant/careers`.
2. Verify 2 seeded postings show.
3. Click "Apply now" on the chef posting — application form opens with the description above.
4. Fill name + phone + email, attach a small PDF (e.g. a 1-page resume) → submit.
5. Verify "Application sent!" confirmation.
6. Try uploading a 6 MB file → should fail with "CV file is too large".
7. Try uploading a `.jpg` (image) → should fail with "CV must be a PDF or Word document".
8. Try uploading a `.txt` file renamed to `.pdf` → should fail (MIME type doesn't match the extension claim).
9. Sign in as OWNER → `/majid-restaurant/admin/careers` — verify both postings show with application counts (the chef posting should have 1 application).
10. Click the application count → dialog opens showing the application. Click "Download CV" — the PDF should download.
11. Create a new posting (title, description, isActive=true) → verify it appears on the public `/careers` page.
12. Toggle the posting inactive → verify it disappears from the public page.
13. Delete the posting → verify it's gone from both admin and public pages.

**Expected result.** CV validation rejects oversized / wrong-type files; application persists; CV downloadable; posting CRUD works; inactive postings hidden publicly.

**Failure signs.** Large files accepted (size check missing); `.exe`-renamed-to-`.pdf` accepted (MIME check missing); inactive postings still visible publicly.

---

## Module E — Customer Accounts, Reviews, Loyalty (Phase 2 + 3)

### E1. Customer sign-up + sign-in (NextAuth)

`src/auth.ts`, `src/components/account/sign-in-view.tsx`, `src/app/[slug]/sign-in/page.tsx`, `src/lib/menu/actions.ts` (`customerSignup`)

**What it is.** Customer auth via NextAuth v5 with a Credentials provider (email + password) and optional Google OAuth (when `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` set). Sign-up form creates a `Customer` row with bcrypt-hashed password. Guest checkout always works — sign-in is never required.

**Why it exists.** PRD §5.13. Accounts enable order history, loyalty accrual, and review ownership. Forcing sign-up at checkout kills conversion (industry data: 25-30% drop-off), so it's optional. Customers who want their loyalty points and history will sign up; one-time guests skip friction.

**How to test**

1. Visit `/majid-restaurant/sign-in`.
2. Click "Create account" tab → fill name "Test User", email "test@example.com", password "test-password-123", phone "0712345678" → submit.
3. Should auto-sign-in and land on `/majid-restaurant/account`.
4. Sign out (header menu).
5. Sign back in with the same credentials → lands on `/account`.
6. Try signing up again with the same email → should fail with "Email already registered".
7. Try signing in with the wrong password → should fail.
8. Visit `/majid-restaurant/checkout` while signed out → guest checkout should still work.
9. *(Optional)* With Google OAuth env vars set, the "Continue with Google" button should appear and work.

**Expected result.** Sign-up creates account + auto-signs-in; duplicate email blocked; guest checkout still works without sign-in.

**Failure signs.** Sign-up doesn't auto-sign-in; duplicate email creates a second account; guest checkout forced to sign in.

---

### E2. Account page — order history + loyalty summary

`src/app/[slug]/account/page.tsx`, `src/components/account/account-content.tsx`

**What it is.** Customer dashboard. If signed-out, shows an EmptyState with a sign-in CTA. If signed-in, shows: order history (last 20 orders with status badges), loyalty card (balance, accrual ratio, available rewards, recent 5 ledger entries).

**Why it exists.** PRD §5.13 + §5.11. The account page is the customer's relationship surface with the restaurant. Order history lets them re-order (Phase 5 feature). Loyalty visibility drives repeat purchases — a customer who sees they're 10 points from a free mango lassi comes back.

**How to test**

1. Sign in as `aisha@example.com` / `aisha-demo-2024`.
2. Visit `/majid-restaurant/account`.
3. Verify the loyalty card shows **10 points** (accrued from the seeded completed order, KSh 1,050 ÷ 100 = 10 points).
4. Verify "Recent activity" shows 1 entry reading "Earned from order #XXXXXX (KSh 1,050)".
5. Verify 3 rewards are listed: Free mango lassi (50 pts), KSh 200 off (100 pts), Free dessert with family combo (KSh 5,000 spend).
6. Verify order history shows the seeded completed order with status badge.
7. Sign out → visit `/account` → should show the sign-in CTA EmptyState.

**Expected result.** Loyalty data accurate; order history populated; signed-out state shows CTA.

**Failure signs.** Loyalty balance wrong (calculation bug); order history empty despite seeded data; signed-out user redirected to sign-in (should show CTA, not redirect).

---

### E3. Customer reviews — gated on completed order

`src/app/[slug]/orders/[orderId]/review/page.tsx`, `src/components/reviews/review-form.tsx`, `src/lib/reviews/actions.ts`

**What it is.** A review form reachable from a completed order's status page. Fields: rating (1-5 stars), comment (optional), photo URL (optional). Pre-conditions: logged-in customer; order belongs to them; order status is COMPLETED; one review per order. New reviews default to `isPublished=false` (moderated). Staff publish/unpublish via admin.

**Why it exists.** PRD §5.10. Reviews drive SEO and conversion — "best biryani in Nakuru" search results show star ratings. Gating on completed orders prevents fake reviews (a competitor can't review without buying). Moderation prevents off-brand / abusive content from going public.

**How to test**

1. Sign in as `aisha@example.com` / `aisha-demo-2024`.
2. Visit `/majid-restaurant/account` → find the seeded completed order → click "Leave a review" (or navigate directly to `/majid-restaurant/orders/<orderId>/review`).
3. Submit 5 stars + "Best biryani in Nakuru!" comment.
4. Should land back on the order page.
5. Visit `/majid-restaurant` (homepage) — the review should NOT appear (it's pending moderation).
6. Sign in as OWNER → `/majid-restaurant/admin/reviews` — find the pending review → click "Publish".
7. Refresh the homepage — the review should now appear in the reviews snippet.
8. Sign in as a different customer (or sign up a new account). Try to visit Aisha's order review URL — should be blocked (order doesn't belong to you).
9. Try to review an order that's still in PREPARING — should be blocked with "You can only review completed orders".
10. Try to submit a second review for the same order — should be blocked ("You've already reviewed this order").

**Expected result.** Only completed-order owners can review; one review per order; reviews hidden until moderated; publish flip makes them visible.

**Failure signs.** Non-owner can review (auth check missing); non-completed order reviewable; review appears publicly before moderation; duplicate reviews allowed.

---

### E4. Loyalty program — accrual, rules, redemption, adjustment, ledger

`src/app/[slug]/admin/loyalty/page.tsx`, `src/components/admin/admin-loyalty-manager.tsx`, `src/lib/loyalty/actions.ts`

**What it is.** A complete loyalty subsystem:
- **Accrual:** automatic + idempotent. `accrueLoyaltyForOrder` fires on first transition to `COMPLETED`. Formula: `floor(order.total / restaurant.loyaltySpendPerPoint)`. Default ratio KSh 100/point.
- **Rules:** OWNER/MANAGER create redemption rules (e.g. "Free mango lassi" / 50 points). Rules can be active/inactive.
- **Redemption:** staff-initiated via admin. Picks a rule or custom points, writes a REDEMPTION ledger entry, decrements balance. Refuses if balance insufficient.
- **Adjustment:** OWNER/MANAGER manually +/- points (signup bonus, error correction). Writes an ADJUSTMENT ledger entry with the staff user + reason.
- **Ledger:** `LoyaltyPointLedger` is the source of truth (audit trail). `Customer.loyaltyPoints` is the cached balance, kept in sync via transaction. A discrepancy means a bug; the ledger can be replayed to rebuild the balance.

**Why it exists.** PRD §5.11. Loyalty drives repeat visits — a customer earning points at your restaurant has a switching cost to go elsewhere. The ledger matters because loyalty points are a financial liability on the restaurant's books; an audit trail is non-negotiable for any serious operation.

**How to test**

1. Sign in as `aisha@example.com` → `/majid-restaurant/account` → verify balance = 10 points + 1 accrual entry.
2. Sign out → sign in as OWNER (`owner@majid.com` / `majid-owner-2024`) → `/majid-restaurant/admin/loyalty`.
3. Verify the accrual ratio shows "1 loyalty point per KSh 100 spent".
4. In customer lookup, search "aisha" → click the result → verify balance (10 points) + 1 completed order + KSh 1,050 lifetime + last order date.
5. In "Redeem reward", select "Free mango lassi" (50 points). The points field auto-fills to 50. Since Aisha only has 10 points, you should see a red "needs 40 more points" warning. Try to redeem anyway → should be blocked.
6. Test manual adjustment: enter +90 points with reason "Signup bonus" → submit. Verify Aisha's balance becomes 100.
7. Redeem the lassi (50 points) → success, balance drops to 50, ledger entry created with staff user = owner@majid.com.
8. Sign back in as Aisha → `/account` → verify balance is 50 + recent activity shows the redemption (-50) and the adjustment (+90).
9. Back as OWNER → create a new reward rule: "Free chapati" / 30 points / "Complimentary chapati on next order" → verify it appears on Aisha's `/account` rewards list.
10. Toggle the rule inactive → verify it disappears from Aisha's rewards list.
11. Try to redeem more points than the customer has (e.g. -1000) → should be blocked.
12. Try redeeming with a negative points value → should be blocked.
13. As MANAGER, verify you can adjust points but cannot change the accrual ratio (OWNER-only).
14. As KITCHEN, verify the loyalty page shows the "not available for kitchen staff" message.

**Expected result.** Accrual is idempotent (no double-awarding); redemption blocked when insufficient balance; adjustments write to ledger with staff attribution; rules toggle visibility on the customer page; role gating enforced.

**Failure signs.** Loyalty accrues twice on double "Complete" click; redemption allows negative balance; rule visibility doesn't update on the customer page; KITCHEN can access the page.

---

## Module F — M-Pesa Daraja Payments (Phase 2)

### F1. M-Pesa STK Push initiation

`src/lib/mpesa/daraja.ts`, `src/lib/orders/actions.ts` (`submitOrder`)

**What it is.** Direct integration with Safaricom's Daraja API. When a customer chooses MPESA at checkout: `submitOrder` calls `initiateStkPush` which OAuths to Daraja, then POSTs the STK push request. The customer's phone receives an M-Pesa prompt to enter their PIN. Order moves to `PENDING_PAYMENT` with `mpesaCheckoutRequestId` stored (the idempotency key for the callback).

**Why it exists.** PRD §5.14. M-Pesa is the dominant payment method in Kenya — over 90% of online transactions. Direct Daraja integration (no aggregator) means lower fees and full control. STK Push (vs. paybill-typing) is frictionless — the customer just enters their PIN.

**Pre-conditions.** All 5 `MPESA_*` env vars set + `NEXT_PUBLIC_MPESA_ENABLED=true` + a publicly-reachable callback URL (use ngrok or cloudflared for local dev).

**How to test**

1. Set the env vars:
   ```env
   MPESA_CONSUMER_KEY=...
   MPESA_CONSUMER_SECRET=...
   MPESA_SHORTCODE=174379   # sandbox
   MPESA_PASSKEY=...
   MPESA_CALLBACK_URL=https://<your-ngrok-url>.lokal/api/mpesa/callback
   MPESA_ENV=sandbox
   NEXT_PUBLIC_MPESA_ENABLED=true
   ```
2. Restart the dev server.
3. Add items to cart → checkout → choose MPESA + enter a sandbox phone number (e.g. `254708374149` — the Safaricom sandbox test number).
4. Submit — should land on `/majid-restaurant/orders/<orderId>?pending=mpesa` with status `PENDING_PAYMENT` and a "Please enter your M-Pesa PIN" hint.
5. In the Safaricom Daraja simulator (or by triggering the sandbox), complete the STK push.
6. Within seconds, the Daraja callback should hit your ngrok URL → order status should flip to `CONFIRMED` + `paidAt` set + receipt number appended to special instructions.
7. Verify the kitchen dashboard (open in another tab) receives the new order via Socket.IO broadcast (or within 15s via polling).
8. Verify the customer (if logged in with FCM enabled) gets a push "Order confirmed".

**Expected result.** STK prompt appears on the test phone; callback flips status to CONFIRMED; receipt number stored; downstream notifications fire.

**Failure signs.** STK push never appears (OAuth failed — check consumer key/secret); callback never arrives (ngrok URL not reachable); status stuck at PENDING_PAYMENT (callback parsing failed — check the body shape).

---

### F2. M-Pesa callback — idempotent

`src/app/api/mpesa/callback/route.ts`

**What it is.** A POST endpoint that Daraja calls after the customer completes (or cancels) the STK push. Idempotent via the `mpesaCheckoutRequestId` unique index on `Order` — duplicate callbacks (Daraja retries on timeouts) return 200 silently with `{replay: true}`. Success → order CONFIRMED + paidAt + receipt in special instructions + Socket.IO broadcast + FCM to customer + staff notif. Failure → order CANCELLED with ResultDesc stored. Always returns 200 to Daraja (otherwise Daraja keeps retrying).

**Why it exists.** PRD §5.14 + GTSS pattern. Daraja retries callbacks up to 4 times if it doesn't get a 200. Without idempotency, a retry would double-confirm the order, potentially double-accruing loyalty or double-broadcasting. The unique index makes retries safe.

**How to test**

1. After completing F1 step 6, inspect the database — the order should have `paidAt` set and `specialInstructions` containing the receipt number.
2. Simulate a Daraja retry: use `curl` to POST the same callback body to `/api/mpesa/callback` again. Should return `200 {replay: true}`. Verify no second loyalty accrual, no second broadcast, no second FCM.
3. Simulate a failure callback: craft a body with `ResultCode != 0` and POST it for a fresh PENDING_PAYMENT order. The order should flip to CANCELLED with `ResultDesc` stored.
4. Verify the endpoint returns 200 even on malformed bodies (Daraja must not get a 4xx).

**Expected result.** Replays are no-ops; failures cancel the order; malformed bodies don't 4xx.

**Failure signs.** Replay causes second loyalty accrual (idempotency broken); failure doesn't cancel the order; malformed body returns 500 (Daraja will hammer you with retries).

---

### F3. M-Pesa disabled mode — graceful fallback

**What it is.** When `NEXT_PUBLIC_MPESA_ENABLED` is not `"true"` (or any of the 5 server-side vars missing), the checkout UI hides the MPESA option and only shows CASH. The rest of the order flow is unaffected.

**Why it exists.** Not every restaurant is in Kenya / uses M-Pesa. The fallback lets the same codebase serve cash-only restaurants without code changes.

**How to test**

1. Remove `NEXT_PUBLIC_MPESA_ENABLED` from `.env` (or set to `"false"`).
2. Restart dev server.
3. Add items to cart → checkout → verify only CASH option visible.
4. Place the order → should succeed as a CASH order, no M-Pesa fields referenced.
5. Re-enable M-Pesa env vars → restart → verify MPESA option reappears.

**Expected result.** Cash-only mode works without errors; M-Pesa option cleanly hidden.

**Failure signs.** Checkout errors when M-Pesa env missing; MPESA option visible but errors on submit.

---

## Module G — Notifications & Real-Time (Phase 2 + 3)

### G1. FCM notifications firing on order status changes

`src/lib/notifications/send.ts`

**What it is.** Server-side FCM senders (no-op gracefully if Firebase Admin env vars missing):
- `notifyOrderPaidCustomer(order)` — "Order confirmed" push to logged-in customer.
- `notifyOrderStatusChange(order, newStatus)` — push for PREPARING / READY / OUT_FOR_DELIVERY / DELIVERED / COMPLETED / CANCELLED.
- `notifyStaffNewOrder(restaurantId, order)` — loud "🔔 New order!" alert to all staff tokens.
- `notifyStaffNewReservation(...)` — "🔔 New reservation" to staff.
- `notifyStaffCateringInquiry(...)` — "🍽️ New catering inquiry" to staff.
- `notifyReservationConfirmed(...)` — push to customer.

**Why it exists.** PRD §5.15. Push notifications are the cheapest channel to reach customers (no SMS fees). For staff, a push on a new order means the kitchen doesn't miss a ticket during a rush. The graceful no-op (no FCM env → silent skip) means the app works in dev without Firebase.

**Pre-conditions.** `FIREBASE_*` (server-side Admin SDK) + `NEXT_PUBLIC_FIREBASE_*` (client SDK) env vars set.

**How to test**

1. Set the Firebase env vars.
2. Sign in as a customer, enable notifications (Module B7) on your device.
3. Place an order (cash).
4. Within seconds, you should get a push "Order confirmed — Majid Restaurant" on the same device.
5. Have staff mark the order as PREPARING — you should get a "Your order is being prepared" push.
6. Have staff mark READY — "Your order is ready for pickup" (or similar).
7. Sign in as staff on a separate device, enable notifications, then have a customer place a new order — staff device should get "🔔 New order! KSh X — delivery/pickup/dine-in".
8. Have a customer submit a reservation — staff should get "🔔 New reservation".
9. Have a customer submit a catering inquiry — staff should get "🍽️ New catering inquiry".

**Expected result.** Customer receives pushes at each status transition; staff receives pushes on new submissions.

**Failure signs.** No push (check FCM env, check the token was registered, check Firebase Admin SDK init); push sent to wrong device (token registered to a different customer).

---

### G2. Real-time kitchen dashboard — Socket.IO + polling fallback

`src/lib/realtime/emit.ts`, `src/components/admin/admin-kitchen-dashboard.tsx`, `src/app/[slug]/admin/kitchen/api/route.ts`

**What it is.** The kitchen dashboard opens a Socket.IO connection to `NEXT_PUBLIC_SOCKET_URL` and joins room `restaurant:<id>`. Re-fetches on every `order:new` / `order:status_changed` event. Always polls `/admin/kitchen/api` every 15 seconds as a fallback (mobile connections drop sockets; the kitchen can't afford to miss an order). Server-side `broadcastOrderEvent` POSTs to `<NEXT_PUBLIC_SOCKET_URL>/emit` with `x-socket-secret` header.

**Why it exists.** PRD §5.16. A kitchen runs on speed. A missed ticket = a hangry customer = a bad review. Socket.IO gives sub-second updates; polling is the safety net because mobile Wi-Fi is unreliable.

**How to test (polling only — no Socket.IO configured)**

1. Sign in as `kitchen@majid.com` / `majid-kitchen-2024` at `/majid-restaurant/admin/sign-in`.
2. Should land on `/majid-restaurant/admin/kitchen` (KITCHEN's default route).
3. Verify 3 columns render: Preparing / Ready / Served.
4. Verify the connection badge in the top-right shows "Polling (no socket)".
5. In another tab, place a new order (customer checkout, cash).
6. Within 15 seconds, the order should appear in the Preparing column on the kitchen dashboard (no manual refresh).
7. Click "Mark ready" on the order card — it should move to the Ready column.
8. Click "Mark served" → moves to Served.
9. Click "Complete" → moves out of the dashboard (status = COMPLETED). Loyalty points accrue if the customer was logged in.
10. Verify the urgency cue: temporarily lower the threshold in `admin-kitchen-dashboard.tsx` (or wait 10+ min) → the card border turns red.

**How to test (real-time — requires Socket.IO service)**

1. Deploy a separate Socket.IO service (small Node/Express app on Railway/Fly.io) that exposes:
   - `POST /emit` — accepts `{room, event}` and broadcasts `event` to sockets in `room`.
   - `connection` handler that joins sockets to rooms via a `join` event.
2. Set `NEXT_PUBLIC_SOCKET_URL` and `SOCKET_SERVER_SECRET` in `.env`.
3. Restart dev server.
4. Open the kitchen dashboard — connection badge should show "Connected".
5. Place an order in another tab — should appear on the kitchen dashboard within ~1 second (vs. 15s polling).

**Expected result.** Orders appear without manual refresh; polling fallback works when Socket.IO is unavailable; urgency cue highlights stale orders.

**Failure signs.** Orders require manual refresh (polling not running); socket connects but events don't fire (secret mismatch); KITCHEN user can't advance order status (role gate broken).

---

### G3. Staff auth — separate JWT cookie

`src/lib/auth/staff.ts`, `src/lib/auth/staff-actions.ts`, `src/proxy.ts`

**What it is.** Staff auth is intentionally separate from customer NextAuth. Staff use email + password only (no OAuth). Sessions are signed JWTs in a separate `majidos_staff_session` cookie, never shared with the customer `next-auth.session-token`. Roles (`OWNER` / `MANAGER` / `KITCHEN` / `FRONT_OF_HOUSE`) gate every admin action. The proxy re-validates the JWT and the `restaurantId` match on every `/admin/*` request (cross-tenant block).

**Why it exists.** PRD §7.2 note. Staff and customers have different security postures. Staff accounts are created by the OWNER (no self-sign-up), use strong passwords, and gate access to business data. Mixing them with customer accounts would create privilege-escalation risks.

**How to test**

1. Visit `/majid-restaurant/admin` while signed out — should redirect to `/majid-restaurant/admin/sign-in`.
2. Sign in as OWNER (`owner@majid.com` / `majid-owner-2024`) — should land on `/admin` (Overview).
3. In DevTools → Application → Cookies — verify `majidos_staff_session` is set, and it's NOT `next-auth.session-token`.
4. Sign in as a customer in another browser tab — verify both sessions coexist without interference.
5. Sign out of staff (`/admin` → click logout) — should clear the staff cookie and redirect to admin sign-in. Customer session should be unaffected.

**Expected result.** Staff session in a separate cookie; customer session unaffected by staff logout; cross-tab isolation works.

**Failure signs.** Staff logout also logs out the customer (cookies shared); staff session persists after logout (cookie not cleared).

---

## Module H — Admin Dashboard & Staff Management (Phase 2 + 3)

### H1. Admin overview — KPIs + action items

`src/app/[slug]/admin/page.tsx`

**What it is.** The OWNER/MANAGER landing page. KPI cards: today's revenue, orders today, reservations today, new inquiries. 7-day revenue sparkline. Active orders list. Upcoming reservations. Action items (pending reviews / new event bookings / active job postings). Quick links to other admin sections.

**Why it exists.** PRD §5.17. The owner opens this daily. The KPIs answer "how are we doing today?" in 3 seconds. Action items surface things needing attention before they become problems (a pending review left unpublished, a catering inquiry not yet contacted).

**How to test**

1. Sign in as OWNER → land on `/majid-restaurant/admin`.
2. Verify 4 KPI cards show non-zero values (seeded data populates them).
3. Verify the 7-day sparkline renders.
4. Verify the active orders list shows current non-COMPLETED orders.
5. Verify the upcoming reservations list shows the next-7-day reservations.
6. Verify action items sections appear (pending reviews, new event bookings, active job postings) with counts.
7. Sign in as KITCHEN → should redirect to `/admin/kitchen` (not the overview).

**Expected result.** All sections render with seeded data; KITCHEN never sees the overview.

**Failure signs.** KPIs all zero (seed data missing or aggregation broken); KITCHEN lands on overview (default route wrong).

---

### H2. Admin orders list + status transitions

`src/app/[slug]/admin/orders/page.tsx`, `src/components/admin/admin-orders-list.tsx`

**What it is.** A list of the last 100 non-DRAFT orders with inline status transitions. Each row: order #, customer name, fulfillment type, total, current status, action buttons.

**Why it exists.** PRD §5.17. The orders list is the staff's main interface for order management. Inline transitions (no modal) mean a manager can clear 20 orders in 30 seconds during a lunch rush.

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/orders`.
2. Verify the list shows seeded historical orders + any you've placed.
3. Pick an order in CONFIRMED → click "preparing" → status badge updates inline.
4. Continue: "ready" → "completed".
5. Try to advance a COMPLETED order further — should be blocked (no transition available).
6. Sign in as FRONT_OF_HOUSE → verify you can view the list and advance statuses.
7. Sign in as KITCHEN → verify the orders list is accessible (KITCHEN can advance statuses too).

**Expected result.** Status transitions persist without page reload; terminal states have no further actions; all staff roles can advance.

**Failure signs.** Status transitions require a full page reload; COMPLETED order can be re-advanced (state machine broken).

---

### H3. Admin menu CRUD + sold-out toggle

`src/app/[slug]/admin/menu/page.tsx`, `src/app/[slug]/admin/menu/[itemId]/page.tsx`, `src/components/admin/admin-menu-list.tsx`, `src/components/admin/menu-item-form.tsx`

**What it is.** A two-page admin: list (with inline availability + popular toggles) + create/edit form. Form fields: name, description, price, image URL, category, availability, popular, vegetarian, vegan, spicy, halal, tags (comma-separated), `mealBuilderStage` (base/protein/drink/dessert/none).

**Why it exists.** PRD §5.17. The owner needs to add seasonal items, mark items sold-out when the kitchen runs out, and edit prices without a developer. The `mealBuilderStage` flag is what makes the Phase 4 Meal Builder work — items tagged `base` show up in the Base stage.

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/menu`.
2. Click "New item" → fill name "Test Special", price 500, category "Grills & BBQ", tags "special, grill", `mealBuilderStage: protein` → save.
3. Verify it appears in the list and on the public `/menu` page.
4. Click the sold-out toggle on the new item → verify the public menu shows it greyed-out.
5. Click the popular toggle → verify it appears in the homepage "Popular Today" grid.
6. Edit the item → change price to 600 → save → verify the public menu shows the new price.
7. Delete the item → verify it disappears from the public menu.
8. Try creating a category with no name → should fail validation.
9. Try deleting a category that has items → should be blocked with "Cannot delete — N items still in this category. Move them first."

**Expected result.** Full CRUD works; toggles reflect on the public menu instantly (revalidation); category deletion blocked when items exist.

**Failure signs.** Public menu doesn't revalidate after edits; category deletion cascades and orphans items; price field accepts negative numbers.

---

### H4. Admin reservations list + confirm/seated/completed workflow

`src/app/[slug]/admin/reservations/page.tsx`, `src/components/admin/admin-reservations-list.tsx`

**What it is.** A list of upcoming reservations with status workflow: PENDING → CONFIRMED → SEATED → COMPLETED (or CANCELLED / NO_SHOW at any point).

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/reservations`.
2. Find the seeded James Kamau reservation (status: PENDING).
3. Click "confirmed" → status flips.
4. Click "seated" → "completed".
5. Submit a fresh reservation as a customer (Module D1) → verify it appears in the admin list.
6. Try "no_show" on a fresh PENDING reservation → status flips to NO_SHOW.

**Expected result.** All transitions persist; customer-side reservation flows into the admin list.

**Failure signs.** Status flips don't persist; new reservations don't appear in admin without a refresh.

---

### H5. Admin catering list + workflow

`src/app/[slug]/admin/catering/page.tsx`, `src/components/admin/admin-catering-list.tsx`

**What it is.** A list of catering inquiries with the workflow: NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED (or DECLINED).

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/catering`.
2. Find the seeded Janet Wanjiru inquiry.
3. Walk it through NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED.
4. Submit a fresh inquiry (Module D2) → verify it appears.
5. Decline a fresh inquiry → status flips to DECLINED.

**Expected result.** All workflow transitions persist; new inquiries appear without refresh.

---

### H6. Admin reviews moderation

`src/app/[slug]/admin/reviews/page.tsx`, `src/components/admin/admin-reviews-list.tsx`

**What it is.** A list of the last 100 reviews with publish/unpublish toggles. Published reviews appear on the homepage snippet; unpublished are hidden.

**How to test**

1. Submit a review as a customer (Module E3) — leaves it unpublished.
2. Sign in as OWNER → `/majid-restaurant/admin/reviews` → find the pending review.
3. Click "Publish" → status flips.
4. Refresh the homepage → review should appear in the reviews snippet.
5. Click "Unpublish" → review should disappear from the homepage.

**Expected result.** Publish/unpublish toggles revalidate the homepage; reviews respect the moderation state on the public site.

---

### H7. Admin staff management (OWNER only)

`src/app/[slug]/admin/staff/page.tsx`, `src/components/admin/admin-staff-list.tsx`

**What it is.** OWNER-only page (other roles see "Owner only" message). CRUD on staff accounts: create (name, email, role, password), edit role, activate/deactivate, reset password, delete. Self-protection guards: can't delete self, can't demote self, can't deactivate self, can't demote/deactivate the last active OWNER.

**Why it exists.** PRD §5.17. Staff management is the highest-privilege operation — a malicious MANAGER promoting themselves to OWNER would be a security breach. OWNER-only + self-protection guards prevent both insider attacks and accidents.

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/staff`.
2. Click "Add staff" → create a new KITCHEN user (name "Test Kitchen", email "test-kitchen@majid.com", password "test-kitchen-2024").
3. Sign out → sign in as the new user → verify the Staff nav link is hidden (only OWNER sees it).
4. Sign back in as OWNER → find the new user → change role to MANAGER → save.
5. Try to change your own role to MANAGER → should be blocked ("Cannot demote self").
6. Try to deactivate yourself → should be blocked.
7. Try to delete yourself → should be blocked.
8. Try to deactivate the only other OWNER (if there is one) → should be blocked ("Cannot deactivate the last active owner").
9. Reset the new user's password → sign in with the new password → should work.
10. Sign in as MANAGER → visit `/admin/staff` → should see the "Owner only" message, no CRUD UI.
11. Sign in as KITCHEN → verify the Staff link is hidden from the nav.

**Expected result.** OWNER can CRUD; other roles blocked; self-protection guards prevent lockout.

**Failure signs.** MANAGER can create staff (privilege escalation); OWNER can demote themselves (lockout); last OWNER can be deactivated (lockout).

---

### H8. Role gating — 4 roles, route-level enforcement

`src/lib/auth/roles.ts`, `src/proxy.ts`, `src/app/[slug]/admin/layout.tsx`

**What it is.** Four staff roles with different access:
- **OWNER** — everything.
- **MANAGER** — everything except staff management + loyalty accrual ratio changes.
- **KITCHEN** — kitchen dashboard + orders only.
- **FRONT_OF_HOUSE** — orders + reservations + catering + events + tables (no analytics, no menu CRUD, no staff, no loyalty rules).

Route-level enforcement via `isRouteAllowedForRole(pathname, role)` in the proxy and `admin/layout.tsx`. Nav items filtered by `getNavForRole(role)`.

**How to test**

1. Sign in as KITCHEN (`kitchen@majid.com` / `majid-kitchen-2024`):
   - Should land on `/admin/kitchen`.
   - Nav should show only Kitchen + Orders (+ sign-out).
   - Manually navigate to `/admin/menu` → should redirect to `/admin/kitchen`.
   - Manually navigate to `/admin/analytics` → should redirect.
   - Manually navigate to `/admin/staff` → should redirect.
2. Sign in as FRONT_OF_HOUSE (create one first as OWNER):
   - Should land on `/admin/orders`.
   - Nav should show Orders + Reservations + Catering + Events + Tables.
   - Analytics + Menu + Staff + Loyalty + Kitchen hidden.
3. Sign in as MANAGER:
   - Nav includes everything except Staff.
   - Can change loyalty rules but not the accrual ratio.
4. Sign in as OWNER:
   - Full nav including Staff.
   - Can change the loyalty accrual ratio.

**Expected result.** Each role sees only its allowed routes; manual URL navigation is redirected; nav reflects role.

**Failure signs.** KITCHEN can access `/admin/analytics` by URL (route gate missing); MANAGER can change accrual ratio (gate too permissive); nav shows links the role can't access.

---

## Module I — Kitchen Dashboard & QR Table Menus (Phase 3)

### I1. Kitchen dashboard — 3-column kanban, tablet-optimized

`src/app/[slug]/admin/kitchen/page.tsx`, `src/components/admin/admin-kitchen-dashboard.tsx`

**What it is.** A tablet-optimized dashboard with 3 columns: Preparing / Ready / Served. Large touch-target buttons (44px+ height). Urgency cues: red border + ring when an order has been in PREPARING > 10 min or READY > 5 min. Per-card: order #, elapsed time, fulfillment type, table label or delivery address, item list with line-item notes, special instructions (highlighted), customer contact for delivery drivers. Real-time via Socket.IO + 15s polling fallback (tested in G2). Role gating: KITCHEN / MANAGER / OWNER can advance; FRONT_OF_HOUSE can view (read-only).

**Why it exists.** PRD §5.16. A kitchen runs on a wall-mounted tablet, not a laptop. Small mouse-targets don't work with greasy fingers. The 3-column flow (Preparing → Ready → Served) mirrors how a kitchen actually moves tickets. Urgency cues catch the forgotten order before the customer complains.

**How to test**

1. Sign in as `kitchen@majid.com` / `majid-kitchen-2024` → land on `/majid-restaurant/admin/kitchen`.
2. Verify 3 columns render: Preparing / Ready / Served. If empty, place a test order first.
3. Verify the connection badge shows "Polling (no socket)" (Socket.IO not configured by default).
4. Place a new order in another tab (cash, delivery) → within 15s the order appears in Preparing.
5. Verify the order card shows: order #, elapsed time (ticking up), fulfillment type (DELIVERY), delivery address, item list with notes, special instructions highlighted.
6. Click "Mark ready" → moves to Ready column.
7. Click "Mark served" → moves to Served column.
8. Click "Complete" → moves out of the dashboard (status COMPLETED). Loyalty accrues if customer was logged in.
9. Place a DINE_IN order via the QR flow (Module I2) → verify the card shows the table label prominently.
10. Sign in as FRONT_OF_HOUSE → verify you can view the dashboard but the advance buttons are disabled (read-only).
11. Urgency cue: lower the threshold in `admin-kitchen-dashboard.tsx` to 1 minute, place an order, wait 1 min → verify the card border turns red.

**Expected result.** 3 columns render with live updates; touch targets are large; urgency cue highlights stale orders; FOH is read-only.

**Failure signs.** Cards require hover-to-click (touch unfriendly); FOH can advance orders (role gate broken); urgency cue never fires.

---

### I2. QR table menus — print sheet + scan → dine-in order

`src/app/[slug]/admin/tables/page.tsx`, `src/components/admin/admin-tables-manager.tsx`, `src/app/[slug]/table/[tableId]/page.tsx`, `src/components/qr/table-landing.tsx`

**What it is.** End-to-end QR table flow:
1. Owner goes to `/admin/tables` → sees all 12 seeded tables with inline QR previews.
2. Owner clicks "Print QR sheet" → opens a printable A4 HTML page with one card per table (label + QR + URL) in a 3-column grid. Prints and laminates one per table.
3. Customer scans the QR with their phone → lands on `/<slug>/table/<shortCode>` (short code = last 8 chars of the table's CUID).
4. The table landing page stashes `tableId` + `tableLabel` in the cart store and shows "Table X — you scanned the QR code for…".
5. Customer clicks "View menu & order" → lands on `/menu`.
6. At checkout, the cart's `tableId` triggers: fulfillment preselected to DINE_IN, table field read-only with a green "Detected from QR code on your table" hint.
7. The Order persists `tableId`. The kitchen dashboard shows the table label prominently.

**Why it exists.** PRD §5.24. QR table menus are post-COVID table-side ordering. No app to install, no waitstaff to flag down, no misheard orders. The kitchen sees the table label so runners know where to deliver. The print sheet means the owner doesn't need to buy proprietary hardware — a laminated paper QR per table.

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/tables`.
2. Verify 12 seeded tables show (Table 1-12) with inline QR previews + capacity + location.
3. Click "Print QR sheet" → a new tab opens with a printable A4 sheet of all 12 QR codes. Print to PDF or paper.
4. Right-click one of the inline QR images → copy image address, OR click "Open table page →" below any QR.
5. The table page loads at `/majid-restaurant/table/<shortCode>` → shows "Table X — you scanned the QR code for…", the table is now bound to your cart.
6. Click "View menu & order" → land on `/majid-restaurant/menu`.
7. Add items to cart → go to `/majid-restaurant/checkout`.
8. Verify:
   - Fulfillment is preselected to DINE_IN.
   - The Table field shows the bound table label, read-only, with a green "Detected from QR code on your table" hint.
   - The Table number input is not editable.
9. Place the order (cash). On the order status page, verify the order has `fulfillmentType: DINE_IN` and `tableId` set.
10. Open the kitchen dashboard (admin) → verify the new dine-in order shows the table label prominently so runners know where to deliver.
11. Back on the table landing page, click "Clear table binding" → cart's tableId should clear, checkout should no longer preselect DINE_IN.
12. Try visiting `/majid-restaurant/table/INVALID000` → should 404 (tenant not-found page).
13. Try creating a new table with capacity 100 → should be blocked (max 50).
14. Delete a table → verify it disappears from the list and the QR sheet.

**Expected result.** QR sheet prints; scan flow binds table to cart; checkout preselects DINE_IN with table read-only; kitchen dashboard shows table label.

**Failure signs.** QR sheet doesn't open in a new tab; cart doesn't bind the table; checkout doesn't preselect DINE_IN; kitchen dashboard doesn't show table label; deleting a table with active orders cascades and breaks them.

---

### I3. Tables CRUD + QR generation

`src/lib/tables/actions.ts`

**What it is.** Server actions: `upsertTable` (label, capacity 1-50, location, branchId), `deleteTable`, `listTables` (returns each table with a base64 PNG QR data URL), `generateQrForTable` (inline single QR), `generateQrPrintSheet` (HTML sheet).

**How to test**

1. Sign in as OWNER → `/admin/tables`.
2. Click "Add table" → label "Patio 1", capacity 4, location "outdoor" → save.
3. Verify the new table appears in the list with an inline QR.
4. Edit the table → change capacity to 6 → save.
5. Delete the table → verify it's gone.
6. Try capacity 0 → should be blocked (min 1).
7. Try capacity 100 → should be blocked (max 50).
8. Try duplicate label "Table 1" → should be allowed (labels not unique) OR blocked depending on policy — check implementation.

**Expected result.** CRUD works; capacity bounded 1-50; QR generates for each table.

---

## Module J — Intelligence Layer: Analytics, AI Recommender, Meal Builder (Phase 4)

### J1. Analytics dashboard — KPIs, charts, conversion funnel

`src/app/[slug]/admin/analytics/page.tsx`, `src/components/admin/admin-analytics-dashboard.tsx`, `src/lib/analytics/actions.ts`

**What it is.** An OWNER + MANAGER-only dashboard with 8 KPI cards + 6 Recharts visualizations:
- **KPI cards** — revenue (last N days), order count, average order value, menu views, conversion rate, returning-customer %, peak hour, top seller.
- **Revenue trend** — daily revenue + order count line chart, last 7 / 30 / 90 days (toggleable via `?days=` query).
- **Conversion funnel** — menu views → orders started → orders completed, with conversion percentages. Menu views de-duped by (sessionId, day).
- **Peak hours heatmap** — 7×24 grid (day-of-week × hour) of order counts, amber scale.
- **Most-ordered items** — horizontal bar chart, top 10 by quantity.
- **Best-selling drinks** — same, filtered to the "Drinks" category.
- **Returning customer rate** — donut chart of new vs returning customers (≥2 orders in window).

Event capture plumbing: `trackEvent` Server Action called from `<AnalyticsTracker>` (mounted on menu page → fires `menu_view` on first load) and from other Server Actions (`createOrderFromCart` records `order_started`; `updateOrderStatus` records `order_completed` on first transition to COMPLETED). `sessionId` is SHA-256(IP + user-agent), opaque, used only for de-duping. No PII stored on event rows.

**Why it exists.** PRD §5.18. The owner needs weekly-checkable business numbers. "What's my best-selling item?", "When should I schedule more staff?", "Is my conversion rate improving?" — these are questions a spreadsheet can't answer in real-time. The conversion funnel specifically shows where customers drop off (browsing → starting checkout → completing), which is actionable.

**How to test**

1. Sign in as OWNER → `/majid-restaurant/admin/analytics`.
2. Verify all 8 KPI cards show non-zero values (seeded data should populate them).
3. Switch the date range from 30d → 7d → 90d (URL `?days=7` / `?days=90`). All charts should refresh.
4. Hover over the revenue trend line chart — tooltip should show date + KSh amount.
5. Verify the conversion funnel shows three stacked bars (menu views → orders started → orders completed) with conversion percentages between stages.
6. Verify the peak hours heatmap shows a 7×24 grid with darker cells during peak hours (lunch 12-14 + dinner 19-21, based on seed data). Hover over a cell → tooltip shows day, hour, order count.
7. Verify the top items bar chart shows seeded popular items (Chicken Biryani, etc.) at the top.
8. Verify the best-selling drinks chart shows Mango Lassi, Tusker, etc.
9. Verify the returning customer donut shows new vs returning split (5 seeded customers, ~150 orders → some returning).
10. Open a private window, visit `/majid-restaurant/menu` (this fires a `menu_view` event). Refresh the analytics dashboard → the menu views KPI should increment.
11. Place an order (cash) → refresh analytics → orders started should increment.
12. Have staff mark the order COMPLETED → refresh analytics → orders completed should increment.
13. Sign in as KITCHEN → manually navigate to `/admin/analytics` → should redirect to `/admin/kitchen` (role gate).
14. Sign in as FRONT_OF_HOUSE → same redirect.
15. Sign in as MANAGER → should access the dashboard.

**Expected result.** All charts render with seeded data; date range toggle works; live events increment KPIs; KITCHEN/FOH blocked; OWNER/MANAGER allowed.

**Failure signs.** Empty charts (seed data missing or aggregation broken); date range toggle doesn't refresh; KITCHEN can access (role gate broken); menu views inflated by refreshes (dedupe broken).

---

### J2. Analytics event capture + privacy

`src/lib/analytics/actions.ts`, `src/components/site/analytics-tracker.tsx`

**What it is.** `trackEvent(eventType, payload)` Server Action. `trackEventInternal(restaurantId, ...)` is the no-headers variant for use inside other Server Actions. Events: `menu_view`, `order_started`, `order_completed`, `recommendation_used`, `meal_builder_used`. `sessionId` is a SHA-256 hash of IP + user-agent — opaque, used only for de-duping. Never throws (failures swallowed).

**Why it exists.** PRD §5.18. Analytics are useful; tracking PII is a liability. By hashing IP + user-agent into an opaque session ID, the restaurant can dedupe repeat visits without storing identity. The never-throws contract means a Prisma outage never breaks the customer-facing flow.

**How to test**

1. Open a private window, visit `/majid-restaurant/menu`.
2. Sign in as OWNER → `/admin/analytics` → verify menu views incremented.
3. Open the database `AnalyticsEvent` table → verify the new `menu_view` row has `sessionId` set to a 64-char hex string (SHA-256), `customerId` null (you were a guest), `payloadJson` "{}".
4. Visit the menu again from the same browser within the same day → verify NO new `menu_view` row (deduped by session + day) — *check the implementation: dedup may happen at query time in `getConversionFunnel`, not at insert time. Either way, the funnel count should not double.*
5. Sign in as a customer → visit the menu → verify a new `menu_view` row has `customerId` set to your customer ID.
6. Trigger an `order_started` event by placing an order → verify the event row has `payloadJson` containing the orderId.
7. Trigger an `order_completed` event by having staff complete the order → verify the event row.

**Expected result.** Events fire on the right triggers; sessionId is hashed (not raw IP); customerId populated for signed-in users; never throws.

---

### J3. AI food recommendation — tag-based engine + optional LLM re-rank

`src/app/[slug]/recommend/page.tsx`, `src/components/site/ai-recommender.tsx`, `src/lib/recommend/actions.ts`, `src/lib/recommend/recommend.ts`

**What it is.** A "Not sure what to order?" UI on the homepage (compact) and `/recommend` (full). Tag-based engine: tokenize the customer's free-text query (lowercase, ASCII, stop-worded), expand each token against a synonym map (`spicy → hot, chilli`, `light → fresh, salad`, `hungry → rice, biryani, grill, beef, mutton`, …), build a per-item haystack (name + description + tags + dietary flags), score (tag exact match +5, name substring +4, dietary flag +3, description substring +1, popular-today boost +1). Return top 6 items with `score` and `matchedOn` reasons. Optionally re-rank with GLM LLM if `.z-ai-config` present; silently falls back to tag order on any LLM failure. Records `recommendation_used` analytics event.

Each result card shows: image, name, price, "match reasons" (the tags / keywords that drove the score — transparency over opacity), dietary flags, "Add to cart" + "Order via WhatsApp" buttons.

**Why it exists.** PRD §5.22. A customer staring at a 22-item menu freezes. "I'm hungry" → ranked suggestions unblocks the decision. Tag-based (not LLM-based) per the PRD: "genuinely sufficient for a menu of realistic size, and avoids adding a per-request AI API cost to a free-tier-conscious deployment." The match-reason transparency builds trust — the customer understands why each item was suggested.

**How to test**

1. Visit `/majid-restaurant` → scroll to the "Not sure what to order?" section.
2. Click a quick-prompt chip (e.g. "Something spicy") → should immediately return ranked suggestions, each with match-reason tags visible.
3. Type a custom query "I'm hungry" → click "Suggest" → should return ranked suggestions.
4. Type "light lunch" → should return vegetarian / salad / fresh items via the synonym map.
5. Type "best sellers" → should return `isPopular=true` items.
6. Each suggestion card should have "Add to cart" and "WhatsApp" buttons. Click "Add to cart" → cart count in the header should increment.
7. Click "Full experience" link → should navigate to `/majid-restaurant/recommend` with the full recommender UI.
8. Try an empty query → should show a friendly error "Tell us what you're in the mood for!".
9. Try a nonsense query "xyzzy abcdef" → should return no results (or a friendly "nothing matched" message).
10. Verify the analytics dashboard (after a few recommendation clicks) shows the `recommendation_used` events accumulating.
11. Verify each result's `matchedOn` reasons are visible — e.g. for "spicy" query, items should show "spicy" or "chilli" as the match reason.

**Expected result.** Quick-prompt chips work; free-text queries return ranked results; match reasons visible; add-to-cart works; analytics events fire; empty query handled gracefully.

**Failure signs.** Returns zero results for any query (tokenizer broken); returns sold-out items (filter missing); no match-reason transparency; empty query crashes the page.

---

### J4. Meal builder — 4-stage combo flow

`src/app/[slug]/meal-builder/page.tsx`, `src/components/site/meal-builder.tsx`

**What it is.** A 4-stage combo builder: Base → Protein → Drink → Dessert. Items are pulled from the menu where the owner has tagged `mealBuilderStage` on the MenuItem (admin menu edit form). Each stage supports multiple items with quantity steppers (e.g. 2× Mango Lassi in the drink stage). Live total updates as the user picks. "Add all to cart" sends every selected line to the cart store and routes to `/cart` or `/checkout`. Mobile-first: sticky summary bar at the bottom shows running total + next/add-all button. Stepper at the top shows progress through the 4 stages with item counts per stage.

**Why it exists.** PRD §5.23. A combo builder is a conversion optimization — customers who would have ordered just a biryani now add a drink and dessert. The 4-stage flow (Base → Protein → Drink → Dessert) matches how people think about a meal, not how a menu is structured. Gated on `Restaurant.comboBuilderEnabled` (404s when off, so tenants whose menu structure doesn't fit never see the link).

**How to test**

1. Visit `/majid-restaurant/meal-builder`. (If you see a 404, verify `Restaurant.comboBuilderEnabled` is true in the DB — the seed sets it to true.)
2. Step 1 (Base) — pick Chicken Biryani. Verify it shows a checkmark and the quantity stepper appears.
3. Click "Next: Protein" → should advance to the protein stage. Verify the stepper at the top shows Base as done.
4. Pick a protein, then a drink, then a dessert.
5. The sticky bottom bar should show the running total updating as you add items.
6. Increase the drink quantity to 2 → total should update.
7. Click "Skip stage" on dessert → should advance to the cart without forcing a dessert pick.
8. Click "Add all to cart" → should redirect to `/cart` with all selected items.
9. Proceed to checkout → the standard order flow handles the rest.
10. Verify the analytics dashboard shows `meal_builder_used` events.
11. In the database, set `Restaurant.comboBuilderEnabled = false` → refresh `/meal-builder` → should 404 with the tenant not-found page.
12. Re-set to true.
13. In the admin menu, edit an item to remove its `mealBuilderStage` tag → verify it no longer appears in the meal builder.
14. Edit an item to add `mealBuilderStage: drink` → verify it appears in the Drink stage.

**Expected result.** 4-stage flow works; live total updates; cart receives all items; analytics event fires; 404s when flag is off; item visibility reflects admin tags.

**Failure signs.** Stage navigation broken; total doesn't update; cart receives wrong items / quantities; flag-off doesn't 404 (means `notFound()` missing).

---

## Module K — Cross-Cutting: Error Boundaries, SEO, PWA, Service Worker

### K1. Error boundaries — tenant + global

`src/app/[slug]/error.tsx`, `src/app/global-error.tsx`

**What it is.** Two error boundaries:
- `app/[slug]/error.tsx` — catches errors in any tenant page. Branded "Something went wrong" page with a digest + "Try again" button (`reset()`). Logs to console.
- `app/global-error.tsx` — catches errors in the root layout itself. Renders inline `<html><body>` with inline styles (no layout dependency). Try-again button.

**Why it exists.** PRD §10. A white-screen 500 error loses the customer forever. A branded error page with a try-again button gives them a path forward. The global boundary matters because the root layout owns fonts + metadata — if it crashes, Next.js can't render anything else.

**How to test**

1. Tenant error: temporarily add `throw new Error("test")` to any tenant page (e.g. `app/[slug]/about/page.tsx`) → visit `/majid-restaurant/about` → should show the branded error page with digest + Try-again button.
2. Remove the throw.
3. Global error: temporarily throw in `app/layout.tsx` → visit any URL → should show the global error page with inline styles.
4. Remove the throw.

**Expected result.** Both boundaries catch errors and show branded pages (not Next.js default white screen).

---

### K2. Tenant 404 page

`src/app/[slug]/not-found.tsx`

**What it is.** A branded 404 page for any unmatched tenant sub-route. Shows "Page not found" with "Back home" + "Browse menu" CTAs.

**How to test**

1. Visit `/majid-restaurant/some-fake-page` → should 404 with the branded tenant not-found page.
2. Verify both CTAs work (Back home → `/majid-restaurant`; Browse menu → `/majid-restaurant/menu`).

---

### K3. Service worker for FCM

`public/sw.js`

**What it is.** A minimal service worker registered for FCM push notifications. Listens for `push` events (Phase 2 wiring).

**How to test**

1. Open DevTools → Application → Service Workers → verify `sw.js` is registered.
2. With FCM env vars set + permission granted → trigger a push (place an order) → verify the SW receives the push event (DevTools console should show logs if any).

---

## End-to-End User Journeys

These multi-step journeys exercise multiple features in sequence. Run them after the per-feature tests pass.

### Journey 1: Guest customer places a cash order end-to-end

1. Visit `/majid-restaurant` → browse homepage.
2. Click "Browse Menu" → `/menu`.
3. Search "biryani" → add Chicken Biryani to cart (qty 2).
4. Click cart icon → `/cart` → verify 2 items, subtotal.
5. Click "Proceed to checkout" → `/checkout`.
6. Choose PICKUP, fill name "Test Guest" + phone "0712345678" → choose CASH → submit.
7. Land on `/orders/<orderId>` with status `CONFIRMED`.
8. Within 4s, status should not change (no staff action yet).
9. Sign in as OWNER in another tab → `/admin/orders` → find the order → advance through PREPARING → READY → COMPLETED.
10. The customer tab should reflect each transition within 4s.
11. The order reaches COMPLETED → polling stops.

**Expected result.** End-to-end flow works without sign-up; status updates propagate; polling stops on terminal status.

---

### Journey 2: Logged-in customer earns loyalty + leaves a review

1. Sign in as `aisha@example.com` / `aisha-demo-2024`.
2. Visit `/majid-restaurant/menu` → add 2 items to cart (total ~KSh 1,000).
3. Checkout → DELIVERY + CASH → place order.
4. Sign in as OWNER → advance the order to COMPLETED.
5. Back as Aisha → visit `/account` → verify:
   - Order history shows the new completed order.
   - Loyalty balance incremented by ~10 points (1000 ÷ 100).
   - Recent activity shows the new accrual entry.
6. From the order history (or the order status page), click "Leave a review" → submit 5 stars + "Great as always!".
7. Sign in as OWNER → `/admin/reviews` → publish the review.
8. Visit `/majid-restaurant` → review should appear in the reviews snippet.

**Expected result.** Loyalty accrues on completion; review gated correctly; moderation flow works.

---

### Journey 3: Dine-in QR table order

1. Sign in as OWNER → `/admin/tables` → click "Print QR sheet" (or just open one table's QR page).
2. On your phone (or in a separate browser tab), open the table URL.
3. Click "View menu & order" → add 2 items to cart.
4. Go to checkout → verify DINE_IN preselected + table label read-only.
5. Place order (cash).
6. Sign in as KITCHEN → `/admin/kitchen` → verify the order appears in Preparing with the table label visible.
7. Click "Mark ready" → "Mark served" → "Complete".

**Expected result.** QR → cart → dine-in checkout → kitchen dashboard flow works end-to-end.

---

### Journey 4: M-Pesa STK Push + idempotent callback

1. Configure all M-Pesa env vars + ngrok.
2. Add items to cart → checkout → choose MPESA + enter sandbox phone.
3. Submit → land on `/orders/<orderId>?pending=mpesa` with status `PENDING_PAYMENT`.
4. In the Daraja simulator, approve the STK push.
5. Callback hits `/api/mpesa/callback` → status flips to `CONFIRMED` + `paidAt` set + receipt in special instructions.
6. Replay the callback (curl the same body) → returns `{replay: true}`, no side effects.
7. Sign in as KITCHEN → verify the order appeared in the dashboard.
8. Sign in as the customer (if FCM enabled) → verify push received.

**Expected result.** STK push fires; callback flips status; replay is a no-op; downstream notifications fire exactly once.

---

### Journey 5: Catering inquiry → admin triage → confirmed event

1. As a public visitor, submit a catering inquiry (Module D2).
2. Sign in as OWNER → `/admin/catering` → find the inquiry (status NEW).
3. Walk through NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED.
4. Verify each transition persists.

**Expected result.** Inquiry flows through the full workflow without losing state.

---

### Journey 6: Careers application with CV upload

1. Visit `/majid-restaurant/careers` → click "Apply now" on a posting.
2. Fill name + phone + email + upload a small PDF CV → submit.
3. Sign in as OWNER → `/admin/careers` → click the application count → dialog opens.
4. Click "Download CV" → PDF downloads.
5. Create a new posting → verify it appears publicly.
6. Toggle inactive → verify it disappears publicly.
7. Delete the posting → verify it's gone everywhere.

---

### Journey 7: Loyalty redemption + adjustment

1. Sign in as Aisha → `/account` → verify 10 points.
2. Sign in as OWNER → `/admin/loyalty` → search Aisha.
3. Try redeeming "Free mango lassi" (50 pts) → blocked (insufficient).
4. Adjust +90 points (reason: "Signup bonus") → balance = 100.
5. Redeem "Free mango lassi" → balance = 50, ledger entry created.
6. Sign back in as Aisha → `/account` → verify balance 50 + ledger shows redemption (-50) + adjustment (+90).
7. As OWNER, create a new rule "Free chapati" / 30 pts → verify it appears on Aisha's rewards list.
8. Toggle the rule inactive → verify it disappears from Aisha's list.

---

### Journey 8: Analytics event capture across customer journey

1. Open a private window, visit `/majid-restaurant/menu` → menu_view event fires.
2. Add items to cart → checkout → place order (cash) → order_started event fires.
3. Sign in as OWNER → complete the order → order_completed event fires.
4. Visit `/majid-restaurant/recommend` → click a suggestion → recommendation_used event fires.
5. Visit `/majid-restaurant/meal-builder` → add items → meal_builder_used event fires.
6. Sign in as OWNER → `/admin/analytics` → verify all 5 event types are reflected in the charts/funnel.

---

## Negative & Edge-Case Test Matrix

These are the "what happens when things go wrong" tests. Each one should produce a graceful, intentional failure — not a 500 or a hang.

| # | Test | Expected behaviour |
|---|------|-------------------|
| 1 | Visit `/nonexistent-tenant` | Tenant 404 page renders |
| 2 | Visit `/majid-restaurant/some-fake-page` | Tenant 404 page renders |
| 3 | Visit `/majid-restaurant/orders/invalidOrderId` | Order status page shows "Order not found" or 404 |
| 4 | Visit `/majid-restaurant/orders/<someone-else's-orderId>` | Order loads (tenant-scoped only — UI access restriction is via obscurity of CUID; verify no PII leak) |
| 5 | Submit review for an order that isn't COMPLETED | Blocked with "You can only review completed orders" |
| 6 | Submit a second review for the same order | Blocked with "You've already reviewed this order" |
| 7 | Cancel an order after CONFIRMED | Blocked with "Call the restaurant" |
| 8 | Book event space when `hasEventSpace = false` | 404 |
| 9 | Visit meal-builder when `comboBuilderEnabled = false` | 404 |
| 10 | Upload a 6 MB CV | Blocked with "CV file is too large" |
| 11 | Upload a `.jpg` CV | Blocked with "CV must be a PDF or Word document" |
| 12 | Upload a `.txt` renamed to `.pdf` | Blocked (MIME type check) |
| 13 | Try to redeem more loyalty points than the customer has | Blocked with "needs N more points" |
| 14 | Try to redeem with a negative points value | Blocked |
| 15 | OWNER tries to demote themselves | Blocked ("Cannot demote self") |
| 16 | OWNER tries to delete themselves | Blocked |
| 17 | OWNER tries to deactivate themselves | Blocked |
| 18 | OWNER tries to deactivate the last active OWNER | Blocked ("Cannot deactivate the last active owner") |
| 19 | KITCHEN user navigates to `/admin/analytics` | Redirected to `/admin/kitchen` |
| 20 | KITCHEN user navigates to `/admin/staff` | Redirected to `/admin/kitchen` |
| 21 | MANAGER tries to change loyalty accrual ratio | Blocked (OWNER-only) |
| 22 | FRONT_OF_HOUSE tries to advance kitchen order | Buttons disabled (read-only) |
| 23 | Create a table with capacity 0 | Blocked (min 1) |
| 24 | Create a table with capacity 100 | Blocked (max 50) |
| 25 | Delete a category that still has items | Blocked with "Cannot delete — N items still in this category. Move them first." |
| 26 | Sign up with a duplicate email | Blocked with "Email already registered" |
| 27 | Sign in with wrong password | Blocked with "Invalid credentials" |
| 28 | Place an order with a sold-out item in cart | Blocked server-side (availability re-checked) |
| 29 | Reserve a table for a past date | Blocked with "Please pick a future date" |
| 30 | Reserve a table exceeding capacity×1.2 in a 2h window | Blocked (capacity check) |
| 31 | M-Pesa callback replayed | 200 `{replay: true}`, no side effects |
| 32 | M-Pesa callback with `ResultCode != 0` | Order CANCELLED with ResultDesc stored |
| 33 | M-Pesa callback with malformed body | Returns 200 (no 4xx to Daraja) |
| 34 | FCM env vars missing | Permission still requested; no token POSTed; customer flow unaffected |
| 35 | Socket.IO env vars missing | Kitchen dashboard shows "Polling (no socket)"; updates within 15s |
| 36 | Database outage during analytics tracking | `trackEvent` swallows error; customer flow unaffected |
| 37 | Switch tenant slugs with items in cart | Cart clears (tenant sync) |
| 38 | Empty query to AI recommender | Friendly error "Tell us what you're in the mood for!" |
| 39 | Nonsense query to AI recommender | "Nothing matched" or empty results |
| 40 | Visit `/admin` while signed out | Redirect to `/admin/sign-in` |
| 41 | Visit `/admin` with a customer session (not staff) | Redirect to `/admin/sign-in` (customer session ≠ staff session) |
| 42 | Staff of tenant A visits tenant B's `/admin` | Redirect to tenant B's `/admin/sign-in` (cross-tenant JWT rejected) |
| 43 | M-Pesa env vars partially set (some missing) | MPESA option hidden, only CASH visible |
| 44 | QR code for a deleted table | 404 on `/table/<shortCode>` |
| 45 | LLM re-rank fails (no `.z-ai-config` or API error) | Falls back to tag-based ranking silently |

---

## Known Limitations & What's Intentionally NOT Implemented

These are documented limitations, not bugs. Test them to confirm the limitation, not to file a defect.

1. **Cloudinary not wired** — Phase 1-4 uses Unsplash source URLs for seed images. When Cloudinary env vars are added, swap the seed URLs and use `next/image` with the Cloudinary loader. Test: verify images load (they will, from Unsplash); don't expect Cloudinary optimizations.

2. **Map is keyless embed** — Uses `https://maps.google.com/maps?q=...&output=embed` which works without an API key. Swap to Google Maps JS API for interactive markers / nearby places. Test: verify map loads (it will); don't expect interactivity beyond pan/zoom.

3. **SQLite for dev** — Production should be Postgres. Schema adaptations are documented (Decimal → Float, String[] → JSON, dropped `@db.*`). Test: schema pushes cleanly; for production, swap `provider = "postgresql"` and the `DATABASE_URL`.

4. **Reservation reminders not wired** — PRD §5.5 calls for "reminder notification 2 hours before reservation time" — requires a cron/scheduler. Test: confirm no reminder fires (expected).

5. **Operating hours enforcement at checkout** — Phase 4 doesn't block orders outside operating hours. Test: place an order at 3am — it should succeed (limitation, not a bug).

6. **Multi-branch UI not surfaced** — Schema supports branches, but the branch switcher isn't surfaced in the UI (single-branch until a real second branch exists). Test: only one branch visible in the admin.

7. **Real-time requires external Socket.IO service** — `src/lib/realtime/emit.ts` POSTs to `NEXT_PUBLIC_SOCKET_URL/emit`. Without a Socket.IO service deployed, the kitchen dashboard relies on 15-second polling (which works fine). Test: confirm polling fallback works; real-time requires deploying the external service.

8. **CV upload is local file system in dev** — Saved to `/public/uploads/cv/`. In production, swap `saveCvFile` in `src/lib/careers/actions.ts` with a Cloudinary uploader (the `cvUrl` column stays the same). Test: CV downloads work in dev via `/uploads/cv/<file>`.

9. **Loyalty EXPIRY entries not generated** — The `EXPIRY` enum exists but no time-based expiry rule is wired. Test: confirm no EXPIRY entries appear (expected).

10. **No automated tests** — This is a manual QA guide. There are no Jest / Playwright / Cypress tests in the repo. Test: confirm `bun test` reports no tests (expected).

---

## Test Sign-Off Checklist

Run this final checklist after all per-feature and journey tests pass. Each item should be ✅.

### Phase 0 — Foundation
- [ ] Multi-tenant routing works (slug → header → context)
- [ ] Tenant isolation enforced (no cross-tenant data leak)
- [ ] Schema pushes + seed completes cleanly
- [ ] PWA manifest + service worker registered

### Phase 1 — Presence & Menu
- [ ] Homepage renders all sections with real data
- [ ] JSON-LD validates in Google's Rich Results test
- [ ] Menu search + filters + sold-out behaviour correct
- [ ] WhatsApp deep link carries correct message
- [ ] Map embed loads without API key
- [ ] Promotions carousel auto-expires
- [ ] FCM opt-in works (token persisted)
- [ ] Gallery lightbox keyboard navigation works
- [ ] About + Contact pages render with seeded data

### Phase 2 — Ordering & Accounts
- [ ] Cart persists across refresh + clears on tenant switch
- [ ] Checkout validation works for each fulfillment type
- [ ] Order lifecycle advances through all states
- [ ] Order status page polls + stops on terminal status
- [ ] Cancellation blocked after CONFIRMED
- [ ] Customer sign-up + sign-in works
- [ ] Account page shows order history + loyalty
- [ ] Reviews gated on completed + ownership + uniqueness
- [ ] M-Pesa STK push + idempotent callback works
- [ ] Staff auth in separate cookie
- [ ] Role gating enforced at route + action level

### Phase 3 — Operations
- [ ] Kitchen dashboard 3 columns + polling fallback
- [ ] QR table print sheet + scan → dine-in flow
- [ ] Loyalty accrual idempotent + ledger accurate
- [ ] Loyalty redemption blocked when insufficient
- [ ] Event bookings 404 when flag off
- [ ] Careers CV validation rejects oversized/wrong-type
- [ ] Self-protection guards prevent staff lockout

### Phase 4 — Intelligence
- [ ] Analytics dashboard renders all 8 KPIs + 6 charts
- [ ] Date range toggle (7/30/90 days) refreshes
- [ ] Conversion funnel de-dupes menu views by session+day
- [ ] AI recommender returns ranked results with match reasons
- [ ] Meal builder 4-stage flow + live total + cart handoff
- [ ] Analytics events fire on each trigger
- [ ] KITCHEN/FOH blocked from analytics

### Cross-Cutting
- [ ] Error boundaries catch + show branded pages
- [ ] Tenant 404 page renders for unmatched routes
- [ ] All negative tests (matrix above) produce graceful failures
- [ ] No 500 errors during normal user flows
- [ ] No console errors in DevTools during normal flows

---

## Document Maintenance

This guide is a living document. When a new feature ships:

1. Add a section under the appropriate module (or create a new module).
2. Follow the standard template: **What it is / Why it exists / Pre-conditions / How to test / Expected result / Failure signs**.
3. Add any negative tests to the edge-case matrix.
4. Add a sign-off checklist item.
5. Update the Table of Contents.

When a feature changes:

1. Update the section.
2. Re-run the how-to-test steps to confirm they still produce the expected result.
3. Note any backward-incompatible changes in a changelog section at the bottom.

---

*Built by GTSS (Great Thumbs Software Solutions) as a speculative pitch build for Majid Restaurant, Nakuru. The codebase is a reusable multi-tenant template — onboarding a second restaurant client is a content upload, not a re-deploy. PRD reference: `requirements.md` (in project root).*
