# MajidOS — Restaurant Growth Platform
## Product Requirements Document (PRD)

**Prepared by:** GTSS (Great Thumbs Software Solutions)
**Status:** Draft v1.0 — Speculative build, Majid Restaurant as launch pitch
**Model:** Reusable multi-tenant template, single-tenant pitch deployment first

---

## 0. Document Purpose & How to Use This

This PRD is written to be implemented in phases, not built all at once. Each phase in Section 9 is a shippable increment — you should be able to stop after any phase and have something that works and demos well.

Two build paths are compatible with this document:

- **Path A — Pitch fast:** Build Phases 0–2 single-tenant, hardcoded for Majid, to get a live demo link in front of them quickly. Retrofit multi-tenancy later if they sign and you want to reuse the codebase.
- **Path B — Template first:** Build multi-tenancy into the schema from day one (as scoped below) so the second restaurant client costs you a fraction of the first. Slightly slower to first demo, much faster to second client.

Given GTSS's pattern of reusable, production-grade builds (Concept Builders, HamuKenya, Pikii), **this document assumes Path B** — multi-tenant from the schema up — but flags every place where you can shortcut to single-tenant if you need the demo out faster. Look for **⚡ Fast-path** callouts.

---

## 1. Product Vision

Majid Restaurant, like most independent Kenyan restaurants, has no owned digital presence. Customers find it through Google, Restaurant Guru, and word of mouth — never through a website the restaurant controls. Every order, reservation, or catering inquiry happens over a phone call or an unstructured WhatsApp message.

MajidOS replaces that with a platform the restaurant owns outright: a website that is simultaneously a digital menu, an ordering system, a reservations desk, a marketing channel, and a source of business intelligence the owner has never had access to before.

The platform is built restaurant-agnostic from the schema level, so the second, third, and tenth restaurant client are a config entry and a content upload — not a new codebase.

### 1.1 Problem Statement

From the discovery notes on Majid Restaurant:

- No official website — discovery happens entirely through third-party directories (Restaurant Guru, Uzamart, AfricaBizInfo) the restaurant does not control.
- Menu discovery happens via WhatsApp photos — slow, unsearchable, easy to lose in a chat thread.
- No online ordering — every order is a phone call or a WhatsApp back-and-forth ("Hi, are you open?").
- No structured reservation system.
- 900+ Google reviews and full breakfast-through-dinner service with dine-in, takeaway, and delivery — real demand exists, but none of it is captured or converted on owned infrastructure.
- Zero data — the owner cannot currently answer "what's my best-selling dish" or "what are my peak hours" with anything more than intuition.

### 1.2 Product Thesis

Sell a **customer acquisition and operations platform**, not a brochure website. The website is the thin layer on top; the real value is the ordering pipeline, the reservation system, the WhatsApp structuring, and the analytics the owner will check every week once they see it once.

### 1.3 Success Criteria (Pitch Stage)

- Live demo deployed and pointed at a real or placeholder Majid menu within Phase 2.
- Demo is convincing enough on mobile (most Kenyan traffic) to move the conversation from "why do I need this" to "when can we launch."
- Codebase requires no schema changes to onboard a second restaurant — only data.

---

## 2. Target Users

| User | Description | Primary Needs |
|---|---|---|
| **Diner (guest)** | Discovers restaurant via Google/social, browses on mobile | Fast menu browsing, easy ordering, no forced signup |
| **Diner (returning)** | Has ordered before, wants convenience | Saved details, order history, loyalty points, faster reorder |
| **Restaurant Owner/Manager** | Non-technical, time-poor | Simple dashboard, sees orders/reservations instantly, understands sales at a glance |
| **Kitchen Staff** | Needs order status without calling the front desk | Clear queue, simple status updates, minimal UI |
| **Front-of-House Staff** | Manages reservations, walk-ins, table state | Reservation calendar, table availability, quick lookup |
| **Platform Admin (GTSS)** | You — manages multiple restaurant tenants | Tenant provisioning, billing status, platform health |

---

## 3. Scope Summary — The 15 Core Problems + Standout Features

Mapped directly from the discovery notes, each numbered item below becomes one or more features in Section 5 and is scheduled into a phase in Section 9.

1. Official online presence (single source of truth for hours/location/menu/reviews)
2. Digital menu (categorized, searchable, image-rich, availability-aware)
3. Online ordering (delivery/pickup/schedule, pay online or cash)
4. Table reservations
5. WhatsApp ordering (structured `wa.me` deep link)
6. Google Maps integration
7. Catering requests
8. Event & meeting space bookings
9. Customer reviews (testimonials + encouraged Google reviews)
10. Loyalty program (points-based)
11. Promotions (homepage banners, time-boxed offers)
12. Careers page (CV upload)
13. Gallery
14. About Us
15. Contact

**Standout / differentiator features:**

- AI food recommendation ("I'm hungry..." → suggestions)
- Meal builder (rice → protein → drink → dessert, live total)
- QR code table menus (scan → view → order → pay)
- Kitchen dashboard (Preparing / Ready / Delivered)
- Admin dashboard (menu, prices, availability, sales, reservations)
- Analytics (best sellers, peak hours, returning customers, revenue trends, conversion rate)
- Multi-branch support (built into schema from day one)

---

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16+ (App Router)** | Server Components by default, Server Actions for mutations |
| Language | TypeScript (strict) | ESM mandatory (Prisma v7 requirement, see §7) |
| ORM | **Prisma v7+** | New `prisma-client` provider, config in `prisma.config.ts`, not `schema.prisma` |
| Database | **PostgreSQL** | Recommend Neon or Supabase for branch/preview DB support |
| Auth | **NextAuth v5 (Auth.js)** | Credentials + Google OAuth for customers; separate role-gated flow for staff |
| Payments | **M-Pesa Daraja API (direct, STK Push)** | Same pattern as prior GTSS client work — no aggregator fee |
| Notifications | **Firebase Cloud Messaging** | Push notifications: order status, reservation confirmation |
| WhatsApp | **`wa.me` deep link** | No API cost for v1; structured message generated client-side |
| Real-time | **Socket.IO — external service** | Deployed separately, this app connects via `NEXT_PUBLIC_SOCKET_URL`. See §8. |
| Image hosting | **Cloudinary** | Menu photos, gallery, restaurant branding |
| Maps | **Google Maps JavaScript API** | Location display, one-click navigation |
| File uploads (Careers) | **Cloudinary or S3-compatible** | CV storage |
| Hosting | **Vercel** | ⚠️ Note free-tier limits — see §11.4, this is a known live concern across your other deployments |
| QR generation | `qrcode` npm package | Server-generated, cached per table |

---

## 5. Feature Specifications

Each feature below includes: description, user stories, data touchpoints, and phase assignment. Full schema is in §7.

### 5.1 Multi-Tenant Foundation *(Phase 0)*

Every entity in the platform belongs to a `Restaurant`. Every query is scoped by `restaurantId`. This is the one decision that must be right from the start — retrofitting tenant isolation onto a single-tenant schema later is a rewrite, not a migration.

**⚡ Fast-path:** If you need the Majid demo out this week, you can hardcode a single `restaurantId` constant everywhere and skip building the subdomain/slug resolution layer. The schema stays multi-tenant either way (it costs nothing extra at write time) — you're only shortcutting the *routing* layer, which is cheap to add back later.

- Each restaurant gets a slug (`majid-restaurant`) usable as a subdomain (`majid.yourplatform.com`) or path (`yourplatform.com/majid-restaurant`) — decide based on how you want to brand the pitch. Subdomain reads more "this is your own site"; path is faster to wire up.
- Tenant resolution happens in middleware, reading the slug and attaching `restaurantId` to the request context for every downstream Server Component and Action.

### 5.2 Official Online Presence *(Phase 1)*

- Homepage aggregates: hours, location, phone, "order now" CTA, today's specials, review snippet.
- Structured data (`schema.org/Restaurant`) in page `<head>` for SEO — directly targets the "best biryani in Nakuru" / "restaurants in Nakuru CBD" search intent called out in the discovery notes.
- Hours support standard weekly hours plus one-off overrides (holidays, Ramadan hours).

### 5.3 Digital Menu *(Phase 1)*

- Categories: Breakfast, Lunch, Dinner, Drinks (owner-configurable per tenant, not hardcoded).
- Each item: name, description, price, image, dietary labels (vegetarian, vegan, spicy, halal), availability toggle, "popular today" flag.
- Search-as-you-type across name + description.
- Category filter chips, sticky on scroll (mobile-first).
- Unavailable items shown greyed-out with "sold out" rather than hidden — reduces "why isn't this here" confusion and keeps SEO value on the page.

### 5.4 Online Ordering *(Phase 2)*

- Cart persists in a Server Action-backed `Order` in `DRAFT` status, not client-only state — survives refresh, works across devices if logged in.
- Fulfillment: delivery / pickup / dine-in.
- Scheduling: "now" or a future time slot within operating hours.
- Payment: M-Pesa STK Push (see §5.14) or cash-on-delivery/pickup.
- On confirmation: order appears instantly on the kitchen dashboard (§5.16) via Socket.IO broadcast, and the customer gets a push notification (§5.15) on every status change.
- No Uber Eats-style commission — this is the direct-order value prop from the discovery notes, worth stating plainly in the pitch deck.

### 5.5 Table Reservations *(Phase 2)*

- Date, time, party size, occasion (birthday, anniversary, business, casual), seating preference (indoor/outdoor).
- Availability check against table capacity config (owner sets total tables + capacity per table in admin).
- Staff-side reservation calendar (day/week view) in the admin dashboard.
- Confirmation via push notification; reminder notification 2 hours before reservation time.

### 5.6 WhatsApp Ordering *(Phase 1)*

- "Order via WhatsApp" button on menu/cart generates a pre-filled message and opens `wa.me/<restaurant-whatsapp-number>?text=<encoded-message>`.
- Message template mirrors the discovery doc's example exactly — item list, fulfillment type, time, name, phone — so staff receiving it don't need training on a new format.
- This is a client-side-only feature for v1: no webhook, no delivery confirmation, no cost. Documented upgrade path to WhatsApp Business Cloud API (used on HamuKenya) is in §12.1 if the client wants two-way automation later.

### 5.7 Google Maps Integration *(Phase 1)*

- Embedded interactive map on Contact and homepage.
- One-click "Get Directions" deep-links to Google Maps app on mobile, web Maps on desktop.
- Parking info as a simple text field in restaurant settings (owner-editable, not hardcoded).

### 5.8 Catering Requests *(Phase 2)*

- Form: event date, guest count, budget range, preferred cuisine/dishes, contact details, event type (wedding, corporate, birthday, school).
- Submissions land in admin dashboard as a distinct `CateringInquiry` list, separate from regular orders, with status tracking (New → Contacted → Quoted → Confirmed → Completed).

### 5.9 Event & Meeting Space Bookings *(Phase 3)*

- Only relevant if the restaurant has bookable space beyond standard tables — gated behind a `hasEventSpace` flag on `Restaurant` so it doesn't clutter the UI for tenants without this.
- Similar booking flow to reservations but for space rental: date, duration, guest count, setup needs.

### 5.10 Customer Reviews *(Phase 2)*

- On-site testimonials with optional photo, tied to a completed order (reduces fake reviews — only customers who ordered can review).
- "Leave a Google review" CTA linking out, since owned-review volume will take time to build and Google review count (900+) is already a trust signal worth surfacing, not replacing.

### 5.11 Loyalty Program *(Phase 3)*

- Points accrue on completed, paid orders — configurable ratio per tenant (e.g., 1 point per KSh 100).
- Owner-configurable rewards ("Spend KSh 5,000 → free dessert", "10 meals → 1 free") stored as flexible `LoyaltyRule` records, not hardcoded logic — different restaurants will want different schemes.
- Requires customer account (§5.13).

### 5.12 Promotions *(Phase 1)*

- Homepage banner carousel, owner-managed, each with title, image, date range (auto-expires), optional linked menu category.
- Examples from discovery notes (Friday Specials, Ramadan Specials, Family Combo) are content, not code — owner creates these in admin without a deploy.

### 5.13 Customer Accounts *(Phase 2)*

- Required for: loyalty points, order history, saved addresses, faster reorder.
- Not required for: browsing menu, placing a guest order, WhatsApp ordering, reservations (guest checkout supported throughout — forcing signup loses orders).
- NextAuth v5 with Credentials + Google OAuth.

### 5.14 M-Pesa Payments *(Phase 2)*

- Daraja API, STK Push flow, direct integration (no aggregator) — consistent with GTSS's existing M-Pesa pattern across other projects.
- Flow: customer confirms order → server initiates STK Push → customer enters M-Pesa PIN on their phone → Daraja callback hits our webhook → order status updates → Socket.IO broadcasts to kitchen dashboard + customer gets push notification.
- Callback endpoint must be idempotent (Daraja can retry callbacks) — dedupe on `CheckoutRequestID`.

### 5.15 Push Notifications *(Phase 1, expanded through later phases)*

- Firebase Cloud Messaging, web push for browser + PWA install prompt for "add to home screen" behavior on mobile (most of your traffic).
- Events: order confirmed, order status changed, reservation confirmed, reservation reminder, catering inquiry acknowledged.
- Owner/staff side: new order alert, new reservation alert — these need to be loud (sound + vibration where supported) since staff won't be staring at a dashboard all day.

### 5.16 Kitchen Dashboard *(Phase 3)*

- Real-time order queue via Socket.IO, three columns: Preparing / Ready / Delivered.
- Large-touch-target status buttons — designed for a tablet mounted in a kitchen, not a mouse-and-keyboard user.
- Order card shows: items, fulfillment type, scheduled time, special instructions, elapsed time since order placed (visual urgency cue past a configurable threshold).

### 5.17 Admin Dashboard *(Phase 2, expanded through later phases)*

- Menu CRUD (items, categories, availability, pricing).
- Order list with filters (status, date, fulfillment type).
- Reservation calendar.
- Catering inquiry list.
- Daily sales summary.
- Staff account management (role-gated: Owner, Manager, Kitchen, Front-of-House).

### 5.18 Analytics *(Phase 4)*

- Most-ordered items, peak ordering hours (heatmap by day/hour), returning-customer rate, revenue trend (daily/weekly/monthly), best-selling drinks, conversion rate (menu views → orders started → orders completed).
- This is the feature that turns a one-time website purchase into an ongoing relationship — the owner checks this weekly once it exists. Worth calling out explicitly in the pitch.

### 5.19 Careers Page *(Phase 3)*

- Open positions list (owner-managed), each with a simple application form + CV upload.
- Applications land in admin as a distinct list, no auto-response needed for v1.

### 5.20 Gallery *(Phase 1)*

- Cloudinary-backed image grid: food, interior, staff, customers-with-permission.
- Lightbox view, lazy-loaded, WebP-served for performance on Kenyan mobile data speeds.

### 5.21 About Us / Contact *(Phase 1)*

- About: story, mission, hygiene standards, sourcing — owner-editable rich text block, not hardcoded copy, since this content will differ per tenant.
- Contact: aggregates phone, email, WhatsApp, address, embedded map, hours — effectively a summary view pulling from restaurant settings rather than a separately maintained page.

### 5.22 AI Food Recommendation *(Phase 4)*

- Simple flow: customer describes mood/craving in free text ("something spicy," "I'm hungry," "light lunch") → matched against menu item tags/descriptions.
- v1 can be tag-based matching (fast, free, no API cost) rather than an LLM call — genuinely sufficient for a menu of realistic size, and avoids adding a per-request AI API cost to a free-tier-conscious deployment. Documented as an explicit upgrade path if the client wants true NLP matching later.

### 5.23 Meal Builder *(Phase 4)*

- Step flow: Base (rice/ugali/chapati) → Protein → Drink → Dessert, with live-calculated total price.
- Only shown for tenants who opt into "combo builder" mode — not every restaurant's menu structure fits this pattern, so it's config-gated, not global.

### 5.24 QR Code Table Menus *(Phase 3)*

- Each physical table gets a generated QR code (via `qrcode` npm package) linking to `/{restaurant-slug}/table/{tableId}` — pre-fills fulfillment type as "dine-in" and table number on the order.
- Printable PDF sheet generator in admin so the owner can print and laminate these themselves.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Mobile-first** | Majority of Kenyan restaurant discovery traffic is mobile. Every feature designed mobile-first, desktop as the enhancement, not the baseline. |
| **Performance** | LCP < 2.5s on 3G-equivalent throttling for the menu page — this is the highest-traffic, highest-conversion page. |
| **Offline resilience** | Menu browsing should degrade gracefully on poor connectivity — consider a lightweight PWA cache for the menu page specifically. |
| **Payment reliability** | STK Push failures must be retryable without double-charging — idempotency on the Daraja side, order status must never silently get stuck in a pending state with no customer-visible retry option. |
| **Data isolation** | No query anywhere in the codebase should be able to leak one tenant's data into another's response. This is enforced structurally in §7, not just by convention. |
| **Accessibility** | Legible font sizes, sufficient tap target sizes (44px minimum) for the kitchen dashboard and mobile ordering flow specifically. |
| **SEO** | Server-rendered menu and about content (not client-only rendered) so search engines can index it — directly serves the "reduce dependence on third-party directories" goal from the discovery notes. |

---

## 7. Data Model (Prisma Schema)

### 7.1 Prisma v7+ Configuration Notes

Per the corrected reference you're already working from: v7 moves the datasource `url` out of `schema.prisma` entirely and into `prisma.config.ts`, renames the generator provider to `prisma-client`, requires an explicit `output` path, and mandates ESM. The blocks below reflect that.

**`prisma.config.ts`** (project root, next to `package.json`):

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

**`package.json`** must include:

```json
{
  "type": "module"
}
```

**`tsconfig.json`** compiler options must include:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### 7.2 Full Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // url intentionally omitted — configured in prisma.config.ts under v7
}

// ─── TENANCY ─────────────────────────────────────────────

model Restaurant {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  tagline       String?
  description   String?  @db.Text
  whatsappPhone String   // used for wa.me deep links, E.164 format
  contactPhone  String
  contactEmail  String?
  address       String
  latitude      Float
  longitude     Float
  parkingInfo   String?
  logoUrl       String?
  coverImageUrl String?
  hasEventSpace Boolean  @default(false)
  comboBuilderEnabled Boolean @default(false)
  currency      String   @default("KES")
  timezone      String   @default("Africa/Nairobi")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  branches       Branch[]
  categories     MenuCategory[]
  menuItems      MenuItem[]
  orders         Order[]
  reservations   Reservation[]
  cateringInquiries CateringInquiry[]
  eventBookings  EventBooking[]
  users          StaffUser[]
  customers      Customer[]
  reviews        Review[]
  promotions     Promotion[]
  loyaltyRules   LoyaltyRule[]
  galleryImages  GalleryImage[]
  jobPostings    JobPosting[]
  operatingHours OperatingHours[]
  tables         RestaurantTable[]

  @@index([slug])
}

model Branch {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  name         String   // e.g. "Nakuru CBD", "Nairobi West"
  address      String
  latitude     Float
  longitude    Float
  contactPhone String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  orders       Order[]
  reservations Reservation[]
  tables       RestaurantTable[]

  @@index([restaurantId])
}

model OperatingHours {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  dayOfWeek    Int      // 0 = Sunday ... 6 = Saturday
  openTime     String   // "08:00"
  closeTime    String   // "22:00"
  isClosed     Boolean  @default(false)

  @@unique([restaurantId, dayOfWeek])
}

model OperatingHoursOverride {
  id           String   @id @default(cuid())
  restaurantId String
  date         DateTime @db.Date
  openTime     String?
  closeTime    String?
  isClosed     Boolean  @default(false)
  reason       String?  // "Public Holiday", "Ramadan Hours"

  @@unique([restaurantId, date])
}

// ─── STAFF / AUTH ────────────────────────────────────────

enum StaffRole {
  OWNER
  MANAGER
  KITCHEN
  FRONT_OF_HOUSE
}

model StaffUser {
  id           String    @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  email        String
  passwordHash String?
  name         String
  role         StaffRole
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())

  @@unique([restaurantId, email])
  @@index([restaurantId])
}

// NextAuth v5 required models — scoped to Customer, not StaffUser
// Staff auth flow is intentionally separate (role-gated, no OAuth) from
// customer-facing NextAuth flow.

model Customer {
  id            String    @id @default(cuid())
  restaurantId  String
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  email         String?
  emailVerified DateTime?
  phone         String?
  name          String?
  image         String?
  loyaltyPoints Int       @default(0)
  createdAt     DateTime  @default(now())

  accounts      Account[]
  sessions      Session[]
  orders        Order[]
  reservations  Reservation[]
  reviews       Review[]
  addresses     CustomerAddress[]

  @@unique([restaurantId, email])
  @@index([restaurantId])
}

model Account {
  id                String  @id @default(cuid())
  customerId        String
  customer          Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  expires      DateTime
}

model CustomerAddress {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  label      String   // "Home", "Work"
  address    String
  latitude   Float?
  longitude  Float?
  isDefault  Boolean  @default(false)
}

// ─── MENU ────────────────────────────────────────────────

model MenuCategory {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  name         String   // "Breakfast", "Lunch", "Drinks"
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)

  items        MenuItem[]

  @@index([restaurantId])
}

model MenuItem {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  categoryId   String
  category     MenuCategory @relation(fields: [categoryId], references: [id])
  name         String
  description  String?  @db.Text
  price        Decimal  @db.Decimal(10, 2)
  imageUrl     String?
  isAvailable  Boolean  @default(true)
  isPopular    Boolean  @default(false)
  isVegetarian Boolean  @default(false)
  isVegan      Boolean  @default(false)
  isSpicy      Boolean  @default(false)
  isHalal      Boolean  @default(false)
  tags         String[] // free-form, used by AI recommendation matching (§5.22)
  mealBuilderStage String? // "base" | "protein" | "drink" | "dessert" — null if not combo-eligible
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orderItems   OrderItem[]

  @@index([restaurantId])
  @@index([categoryId])
}

// ─── ORDERS ──────────────────────────────────────────────

enum OrderStatus {
  DRAFT
  PENDING_PAYMENT
  CONFIRMED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  COMPLETED
  CANCELLED
}

enum FulfillmentType {
  DELIVERY
  PICKUP
  DINE_IN
}

enum PaymentMethod {
  MPESA
  CASH
}

model Order {
  id              String    @id @default(cuid())
  restaurantId    String
  restaurant      Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  branchId        String?
  branch          Branch?   @relation(fields: [branchId], references: [id])
  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])
  tableId         String?
  table           RestaurantTable? @relation(fields: [tableId], references: [id])

  // Guest checkout support — order doesn't require a Customer
  guestName       String?
  guestPhone      String?

  status          OrderStatus @default(DRAFT)
  fulfillmentType FulfillmentType
  scheduledFor    DateTime?   // null = "as soon as possible"
  deliveryAddress String?
  specialInstructions String? @db.Text

  subtotal        Decimal   @db.Decimal(10, 2)
  total           Decimal   @db.Decimal(10, 2)

  paymentMethod   PaymentMethod?
  mpesaCheckoutRequestId String? @unique // Daraja idempotency key
  paidAt          DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  items           OrderItem[]

  @@index([restaurantId, status])
  @@index([customerId])
  @@index([mpesaCheckoutRequestId])
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId String
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  quantity   Int
  unitPrice  Decimal  @db.Decimal(10, 2) // snapshot at time of order — price changes shouldn't rewrite history
  notes      String?

  @@index([orderId])
}

// ─── RESERVATIONS & TABLES ───────────────────────────────

enum ReservationStatus {
  PENDING
  CONFIRMED
  SEATED
  COMPLETED
  CANCELLED
  NO_SHOW
}

model RestaurantTable {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  branchId     String?
  branch       Branch?  @relation(fields: [branchId], references: [id])
  label        String   // "Table 4", "Patio 2"
  capacity     Int
  location     String?  // "indoor" | "outdoor"
  qrCodeUrl    String?  // generated, cached

  reservations Reservation[]
  orders       Order[]

  @@index([restaurantId])
}

model Reservation {
  id            String   @id @default(cuid())
  restaurantId  String
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  branchId      String?
  branch        Branch?  @relation(fields: [branchId], references: [id])
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  tableId       String?
  table         RestaurantTable? @relation(fields: [tableId], references: [id])

  guestName     String
  guestPhone    String
  partySize     Int
  reservedFor   DateTime
  occasion      String?  // "birthday" | "anniversary" | "business" | "casual"
  seatingPref   String?  // "indoor" | "outdoor" | "no preference"
  status        ReservationStatus @default(PENDING)
  notes         String?  @db.Text

  createdAt     DateTime @default(now())

  @@index([restaurantId, reservedFor])
}

// ─── CATERING & EVENTS ───────────────────────────────────

enum InquiryStatus {
  NEW
  CONTACTED
  QUOTED
  CONFIRMED
  COMPLETED
  DECLINED
}

model CateringInquiry {
  id             String   @id @default(cuid())
  restaurantId   String
  restaurant     Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  contactName    String
  contactPhone   String
  contactEmail   String?
  eventDate      DateTime
  guestCount     Int
  budgetRange    String?
  preferredCuisine String?
  eventType      String?  // "wedding" | "corporate" | "birthday" | "school"
  notes          String?  @db.Text
  status         InquiryStatus @default(NEW)
  createdAt      DateTime @default(now())

  @@index([restaurantId, status])
}

model EventBooking {
  id            String   @id @default(cuid())
  restaurantId  String
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  contactName   String
  contactPhone  String
  eventDate     DateTime
  durationHours Float
  guestCount    Int
  setupNeeds    String?  @db.Text
  status        InquiryStatus @default(NEW)
  createdAt     DateTime @default(now())

  @@index([restaurantId, status])
}

// ─── REVIEWS, PROMOTIONS, LOYALTY ────────────────────────

model Review {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  customerId   String?
  customer     Customer? @relation(fields: [customerId], references: [id])
  orderId      String?  // linking to a completed order reduces fake reviews
  rating       Int      // 1-5
  comment      String?  @db.Text
  photoUrl     String?
  isPublished  Boolean  @default(false) // owner moderates before going live
  createdAt    DateTime @default(now())

  @@index([restaurantId, isPublished])
}

model Promotion {
  id             String   @id @default(cuid())
  restaurantId   String
  restaurant     Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  title          String
  description    String?
  imageUrl       String?
  linkedCategoryId String?
  startDate      DateTime
  endDate        DateTime
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)

  @@index([restaurantId, isActive])
}

model LoyaltyRule {
  id            String   @id @default(cuid())
  restaurantId  String
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  description   String   // "Spend KSh 5,000, get free dessert"
  pointsRequired Int?
  spendThreshold Decimal? @db.Decimal(10, 2)
  rewardDescription String
  isActive      Boolean  @default(true)

  @@index([restaurantId])
}

// ─── GALLERY, CAREERS ────────────────────────────────────

model GalleryImage {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  imageUrl     String
  caption      String?
  category     String?  // "food" | "interior" | "staff" | "customers"
  sortOrder    Int      @default(0)

  @@index([restaurantId])
}

model JobPosting {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  title        String
  description  String   @db.Text
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  applications JobApplication[]

  @@index([restaurantId, isActive])
}

model JobApplication {
  id            String   @id @default(cuid())
  jobPostingId  String
  jobPosting    JobPosting @relation(fields: [jobPostingId], references: [id], onDelete: Cascade)
  applicantName String
  applicantPhone String
  applicantEmail String?
  cvUrl         String
  createdAt     DateTime @default(now())

  @@index([jobPostingId])
}
```

### 7.3 Multi-Tenancy Enforcement Pattern

Schema-level `restaurantId` scoping only works if it's enforced at the query layer too. Recommended pattern: wrap the Prisma client in a tenant-scoped accessor rather than trusting every call site to remember the `where` clause.

```typescript
// src/lib/db/tenant-scope.ts
import { prisma } from "./client";

export function tenantDb(restaurantId: string) {
  return {
    menuItem: {
      findMany: (args: Parameters<typeof prisma.menuItem.findMany>[0] = {}) =>
        prisma.menuItem.findMany({
          ...args,
          where: { ...args.where, restaurantId },
        }),
      // repeat for create/update/delete, and for every other model
    },
    // ... same pattern for order, reservation, etc.
  };
}
```

This is more boilerplate up front than calling `prisma.menuItem.findMany()` directly everywhere, but it makes tenant leakage a compile-time-adjacent problem instead of a code-review-vigilance problem — worth the cost given this is a template meant to hold multiple paying clients' data in one database.

---

## 8. Real-Time Architecture (Socket.IO — External Service)

Per your setup: Socket.IO does not run inside this Next.js app. It is deployed as a **separate service** (recommend a small Node/Express + Socket.IO app on Railway, Render, or a VPS — anywhere that supports persistent WebSocket connections, which Vercel's serverless functions do not).

### 8.1 Integration Points

- This Next.js app connects to the external Socket.IO server via `NEXT_PUBLIC_SOCKET_URL` (client-side) and a server-side equivalent for emitting events from Server Actions/webhooks.
- **Events emitted by this app → Socket.IO server → broadcast to relevant rooms:**
  - `order:new` — new order placed → kitchen dashboard room for that `restaurantId`
  - `order:status_changed` — → kitchen dashboard room + specific customer's session
  - `reservation:new` — → front-of-house room
- **Rooms are namespaced by `restaurantId`** — this is the tenant isolation boundary on the socket side, mirroring the DB-level isolation in §7.3. A kitchen dashboard for Restaurant A must never receive events from Restaurant B's room.

### 8.2 What This App Needs From You

Once the Socket.IO service is deployed separately, this PRD only needs:

```env
NEXT_PUBLIC_SOCKET_URL=wss://your-socket-service.example.com
SOCKET_SERVER_SECRET=<shared secret for server-to-server auth on emit>
```

The kitchen dashboard (§5.16) and admin order list are the two UI surfaces that actually need a live socket connection open. Everything else (customer-facing order status) can be push-notification-driven (§5.15) instead of a persistent socket connection — cheaper and simpler on mobile, where an open WebSocket isn't reliable anyway on patchy connections.

---

## 9. Phased Implementation Roadmap

Each phase is independently shippable. Phase 0 and 1 together are enough to have a real, demoable link.

### Phase 0 — Foundation (Days 1–2)

- Next.js 16 App Router project scaffold, TypeScript strict mode.
- Prisma v7 setup: `prisma.config.ts`, ESM config, schema from §7.2, initial migration.
- Multi-tenant middleware: slug resolution → `restaurantId` context.
- Base layout, design tokens (see note in §11.2 on using the `frontend-design` skill), mobile-first shell.
- Seed script with realistic Majid-style placeholder data (categories, ~20 menu items with images, operating hours).
- Deploy skeleton to Vercel — get the URL live early, even mostly empty, so every subsequent phase has a real link to check.

**Exit criteria:** `majid-demo.yourplatform.com` (or equivalent) resolves, shows a homepage shell, database is connected.

### Phase 1 — Presence & Menu (Days 3–7)

Features: §5.2 (Official presence), §5.3 (Digital menu), §5.6 (WhatsApp ordering), §5.7 (Google Maps), §5.12 (Promotions), §5.15 (Push notifications — setup only), §5.20 (Gallery), §5.21 (About/Contact).

- This phase alone is enough to replace "no website" with a genuinely good one — it's the version you can screen-share in the actual pitch call if Phase 2 isn't done yet.
- Firebase project setup + FCM token registration flow (notifications fire starting Phase 2, but the plumbing belongs here).

**Exit criteria:** A visitor can browse the full menu, search/filter it, see hours/location/promos, and place a WhatsApp order — all on mobile, all fast.

### Phase 2 — Ordering, Reservations & Accounts (Days 8–16)

Features: §5.4 (Online ordering), §5.5 (Reservations), §5.10 (Reviews), §5.13 (Customer accounts), §5.14 (M-Pesa), §5.17 (Admin dashboard — core version), §5.8 (Catering requests).

- This is the highest-complexity phase — payment idempotency (§5.14) and multi-tenant order scoping (§7.3) both need to be right here, not patched later.
- NextAuth v5 setup for customer accounts, guest checkout as the default path.

**Exit criteria:** A customer can place and pay for a real order end-to-end; the owner can see it land in a basic admin view; a reservation can be made and confirmed.

### Phase 3 — Operations Layer (Days 17–24)

Features: §5.9 (Event/meeting bookings, if `hasEventSpace`), §5.11 (Loyalty), §5.16 (Kitchen dashboard + Socket.IO integration), §5.19 (Careers), §5.24 (QR table menus).

- Socket.IO external service should be deployed and pointed at before this phase starts (§8).
- This is where the "operations platform," not just "website," pitch really lands — the kitchen dashboard and QR menus are the features that make staff notice the change day-to-day.

**Exit criteria:** Kitchen staff can run order fulfillment entirely from the dashboard; a printed QR code on a table produces a working dine-in order.

### Phase 4 — Intelligence Layer (Days 25–30+)

Features: §5.18 (Analytics), §5.22 (AI recommendation), §5.23 (Meal builder).

- Analytics first — it's the retention feature, the reason the owner keeps paying after launch excitement fades.
- AI recommendation and meal builder are the "stand out in the pitch deck" features — high visual impact, lower urgency than everything above.

**Exit criteria:** Owner has a weekly-checkable dashboard of real business numbers; the site has at least one genuinely novel interaction (recommendation or meal builder) that a competitor's brochure site doesn't.

---

## 10. Pitch Positioning Notes

Pulled directly from the value framing in the discovery notes — worth keeping close to the actual pitch deck, not just the build doc:

- Frame as **"customer acquisition and operations platform,"** never "website" — this positioning should show up in every piece of client-facing copy, not just the sales call.
- Lead with the **directory dependency problem**: third-party sites (Restaurant Guru, Uzamart, AfricaBizInfo) currently own the discovery layer Majid should own itself.
- The **900+ Google reviews** and full breakfast-through-dinner, dine-in/takeaway/delivery service profile is proof of real demand — the pitch isn't "will people order," it's "you're currently leaving orders on the table because there's nowhere for them to land."
- **No commission model** (versus Uber Eats-style platforms) is a concrete, quantifiable saving worth calculating into the pitch with real numbers once you have estimated order volume.
- SEO targets are explicit and searchable today: "best biryani in Nakuru," "restaurants in Nakuru CBD," "family restaurant Nakuru" — these can be shown ranking (or not) in a live search during the pitch, which is a strong visual.

---

## 11. Open Decisions & Risks

### 11.1 Open decisions (flagged in the source notes, need an answer before or during Phase 0/1)

- **Monetization model for the template:** flat build fee, monthly SaaS fee per restaurant, commission on orders, or hybrid? Doesn't block Phase 0–1 build but should be settled before Phase 2 (payments) so invoicing/fee logic isn't retrofitted.
- **Multi-branch reality check:** is Majid actually multi-branch today, or is this schema-level readiness for a hypothetical future branch? If single-branch, `Branch` model still costs nothing to include (one row) but keep the UI from surfacing branch-switching until it's real.
- **KYC/verification approach** for future restaurant tenants beyond Majid — not urgent for the pitch build, but relevant once this becomes a template you're selling to multiple clients.

### 11.2 Design system

Before Phase 0 layout work, read the `frontend-design` skill for design-token and styling guidance appropriate to this build environment — worth doing once at the start rather than retrofitting a design system after components are already built ad hoc.

### 11.3 Testing the demo on real conditions

Given the mobile-first, Kenyan-connectivity context, test Phase 1's menu page specifically on throttled 3G before calling it pitch-ready — a beautiful menu that takes 8 seconds to load on the actual conditions a diner will use it in undercuts the whole pitch.

### 11.4 Vercel free-tier limits

This is a live, named concern across your other production deployments already. Before this project goes live (even as a demo getting real traffic during a pitch), check current usage across your existing Vercel deployments — a demo going down mid-pitch because a sibling project ate the shared free-tier quota is an avoidable failure mode worth checking for explicitly, not assuming won't happen.

---

## 12. Future Expansion (Documented, Not Scheduled)

Explicitly out of scope for the initial phases, but worth having written down so "can it do X later" has a ready answer during the pitch rather than an improvised one.

### 12.1 WhatsApp Business Cloud API upgrade

If a client wants two-way WhatsApp automation (order confirmations sent back via WhatsApp, not just customer-initiated `wa.me` links) — same pattern as the Communication feature already built on Pikii and the notification approach used on HamuKenya. This is an additive upgrade, not a rework: the `wa.me` deep link stays as the zero-cost fallback for tenants who don't need automation.

### 12.2 Multi-branch central management

Schema already supports it (§7.2, `Branch` model). Remaining work when a real second branch exists: branch-switcher UI, branch-specific menu overrides (some items only available at one location), branch-specific delivery radius.

### 12.3 Additional restaurant tenants

Once Majid (or another first client) is live, onboarding tenant #2 should be: create `Restaurant` row + `OperatingHours` + seed menu data + branding assets. No schema changes, no new deploy target — this is the entire point of building multi-tenant from Phase 0.

---

## Appendix A — Environment Variables Reference

```env
# Database
DATABASE_URL=

# NextAuth v5
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# M-Pesa Daraja
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
MPESA_ENV=sandbox # or production

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Socket.IO (external service)
NEXT_PUBLIC_SOCKET_URL=
SOCKET_SERVER_SECRET=
```

---

*End of document.*
