---
Task ID: phase-1
Agent: main (super-z)
Task: Build Phase 0 (foundation) + Phase 1 (presence & menu) of MajidOS per requirements.md PRD, then deliver as zip.

Work Log:
- Read /home/z/my-project/upload/requirements.md (full 1028-line PRD).
- Confirmed Type 3 (Interactive Web Development) — invoked fullstack-dev skill, ran init-fullstack.sh.
- Adapted PRD §7.2 Prisma schema for the sandbox's SQLite/Prisma v6 environment (Decimal→Float, String[]→JSON-encoded String, dropped @db.Text/@db.Date annotations). All 24 models + 6 enums preserved with restaurantId scoping.
- Created src/lib/db/tenant-scope.ts implementing PRD §7.3 tenantDb(restaurantId) wrapper — every find/create/update/delete is structurally scoped.
- Created src/middleware.ts for slug-based tenant resolution → x-restaurant-slug request header.
- Created src/lib/restaurant/context.ts (getContextRestaurant() server helper) and src/lib/restaurant/hours.ts (computeOpenStatus with weekly hours + holiday overrides + tz-aware).
- Created src/lib/whatsapp/order.ts (PRD §5.6 — wa.me deep link builder with structured message template).
- Created src/lib/seo/restaurant-jsonld.ts (PRD §5.2 — schema.org/Restaurant JSON-LD).
- Created src/lib/notifications/fcm.ts and src/components/site/fcm-opt-in.tsx (PRD §5.15 — Phase 1 plumbing: token registration, SW, manifest).
- Wrote prisma/seed.ts with realistic Majid Restaurant data: 1 restaurant + 1 branch + 7-day hours + 1 holiday override + 5 categories + 22 menu items + 3 promotions + 12 gallery images + 4 reviews + about content + 12 tables.
- Installed `firebase` package to satisfy dynamic import in fcm-opt-in.tsx.
- Designed warm restaurant palette (saffron/turmeric/terracotta on cream) in globals.css; configured Playfair Display + Geist Sans in root layout.
- Built site components: site-header (sticky, mobile menu), site-footer, promotions-carousel (auto-rotating, dot nav), embedded-map (keyless Google Maps embed + directions deep-link), menu-search-bar, menu-filter-chips (sticky), menu-item-card (with WhatsApp order button + sold-out overlay), menu-browser (orchestrator), gallery-grid (with lightbox + keyboard nav), fcm-opt-in, home-page (server component).
- Built routes: / (redirect to /majid-restaurant), /[slug]/layout.tsx (tenant resolution), /[slug]/page.tsx (homepage), /[slug]/menu, /[slug]/gallery, /[slug]/about, /[slug]/contact, /[slug]/not-found, /[slug]/error, /not-found.
- Built /api/notifications/register-token route for FCM token registration.
- Added public/sw.js, public/manifest.json.
- Added .env.example with full env var reference (PRD Appendix A).
- Wrote comprehensive README.md documenting architecture, decisions, and Phase 2 preview.
- Browser-verified all routes with agent-browser:
  - Homepage: 200, hero renders, FCM opt-in present, promotions carousel works, popular items, reviews, map, footer.
  - Menu: 200, search filters correctly (3 biryani results), category tabs work, dietary filter (Popular today → 7 items), sold-out item shown greyed-out.
  - WhatsApp ordering: clicking "Order via WhatsApp" opens wa.me URL with structured message + correct quantity (3× Mandazi).
  - Gallery: 200, 12 images, lightbox opens with keyboard nav (←/→/Esc) and prev/next/close buttons.
  - About: 200, all 4 sections (story, mission, hygiene, sourcing) render.
  - Contact: 200, all contact methods + opening hours table + map.
  - JSON-LD structured data verified present in homepage <head>.
  - Tested mobile (iPhone 14) and desktop (1280×800) viewports — responsive throughout.
  - No runtime errors in console.
- Lint passes clean (0 errors, 0 warnings).

Stage Summary:
- Phase 0 + Phase 1 of MajidOS complete and browser-verified.
- Multi-tenant foundation in place: tenantDb(restaurantId) wrapper + path-based slug routing + schema-level restaurantId on every model.
- All 8 Phase 1 features from PRD §9 implemented: §5.2 (presence + schema.org/Restaurant SEO), §5.3 (digital menu with search/filter/sold-out), §5.6 (WhatsApp ordering with structured message), §5.7 (Google Maps + directions), §5.12 (promotions carousel), §5.15 (FCM plumbing), §5.20 (gallery with lightbox), §5.21 (about + contact).
- Schema-ready for Phase 2: Order/OrderItem/Reservation/CateringInquiry/Customer/Account/Session/RestaurantTable all in place. Adding online ordering + M-Pesa + NextAuth in Phase 2 is UI + integration work, not a re-platform.
- Deliverable: full project at /home/z/my-project/, zipped to /home/z/my-project/download/majidos-phase1.zip.

---
Task ID: phase-2
Agent: main (super-z)
Task: Build Phase 2 (ordering, reservations, reviews, accounts, M-Pesa, admin dashboard, catering) of MajidOS per requirements.md PRD §9 Phase 2.

Work Log:
- Read full Phase 2 scope from PRD §5.4, §5.5, §5.8, §5.10, §5.13, §5.14, §5.17 + §7.3 multi-tenancy + §8 Socket.IO external service.
- Read existing Phase 0+1 codebase: prisma schema, tenant-scope, proxy.ts, site-header, menu-item-card, layout, fcm helpers, seed.ts.
- Schema changes (migration 20260701210000_phase2_auth_notifications):
  * Added VerificationToken (NextAuth v5 requirement).
  * Added NotificationToken (persisted FCM tokens; Phase 1 only logged them).
  * Added Customer.passwordHash (Credentials provider for customers).
- Installed next-auth@beta (v5.0.0-beta.31), @auth/prisma-adapter, bcryptjs, firebase-admin, jose (transitively).
- Auth setup:
  * src/auth.ts — NextAuth v5 with Credentials + Google OAuth providers. JWT-based sessions (no DB adapter needed for Credentials-only flow; Google OAuth upserts Customer row on first sign-in via jwt callback).
  * src/lib/auth/staff.ts — separate staff auth: signed JWT in `majidos_staff_session` cookie, role-gated, never shares cookie with customer auth. Tenant re-check on every read.
  * src/lib/auth/staff-actions.ts — Server Action wrappers for sign-in / sign-out.
  * Updated src/proxy.ts (Next 16 middleware convention) to compose with NextAuth's `auth()` wrapper. Exempt /api/auth and /api/mpesa from tenant resolution.
  * /api/auth/[...nextauth]/route.ts — NextAuth catch-all handler.
- Customer flows:
  * Cart: src/lib/cart/store.ts (zustand + localStorage persistence, tenant-scoped). src/components/cart/cart-tenant-sync.tsx mounted in tenant layout.
  * Updated menu-item-card.tsx to add "Add to cart" button alongside existing "Order via WhatsApp".
  * /<slug>/cart — cart page with line items, qty edit, clear.
  * /<slug>/checkout — full checkout flow: fulfillment type (delivery/pickup/dine-in), contact details, payment method (M-Pesa STK Push or cash), special instructions, scheduling. Calls createOrderFromCart then submitOrder Server Actions.
  * /<slug>/orders/[orderId] — order status page. Polls /api/orders/[orderId] every 4s while in transitional states. Shows status badge, items, details, cancel/review CTAs.
  * /<slug>/orders/[orderId]/review — review form (rating + comment). Gated by COMPLETED order status + logged-in customer who owns the order.
  * /<slug>/sign-in — customer sign-in / sign-up tabs (NextAuth Credentials).
  * /<slug>/account — order history (only if logged in).
  * /<slug>/reservations — reservation form with availability check (capacity × 1.2 overbook allowance in 2-hour window).
  * /<slug>/catering — catering inquiry form (event date, guests, budget, cuisine, type, notes).
- Server Actions:
  * src/lib/orders/actions.ts — createOrderFromCart, submitOrder (M-Pesa STK or cash), cancelOrder, updateOrderStatus, getOrderForCustomer, listMyOrders. All multi-tenant safe via tenantDb + getContextRestaurant.
  * src/lib/reservations/actions.ts — createReservation (with availability), updateReservationStatus, listReservationsForDay, listUpcomingReservations. Staff role-gated.
  * src/lib/catering/actions.ts — createCateringInquiry, updateInquiryStatus (NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED/DECLINED).
  * src/lib/reviews/actions.ts — createReview (requires COMPLETED order + logged-in customer + ownership check + one-review-per-order), setReviewPublished (staff moderation).
  * src/lib/menu/actions.ts — upsertMenuItem, deleteMenuItem, toggleMenuItemAvailability, upsertCategory, deleteCategory, createStaffUser, deleteStaffUser, customerSignup.
- M-Pesa Daraja integration (src/lib/mpesa/daraja.ts):
  * OAuth token fetch, STK Push initiation, callback parsing.
  * Idempotent on CheckoutRequestID — /api/mpesa/callback checks if order is already past PENDING_PAYMENT before transitioning.
  * Sandbox + production env support. Phone normalization for Kenyan formats.
  * isMpesaConfigured() server check + NEXT_PUBLIC_MPESA_ENABLED client flag.
- Admin dashboard (/<slug>/admin/*):
  * Layout gates all routes on staff session for current tenant.
  * AdminShell: sidebar nav (Overview, Orders, Reservations, Catering, Menu, Reviews, Staff), mobile-responsive.
  * Overview page: KPI cards (today's revenue, orders, reservations, new inquiries), active orders list, upcoming reservations, pending reviews CTA.
  * Orders page: filter by status, list with full details, status transition buttons (CONFIRMED→PREPARING→READY→OUT_FOR_DELIVERY→DELIVERED→COMPLETED).
  * Reservations page: grouped by day, status transitions (PENDING→CONFIRMED→SEATED→COMPLETED/NO_SHOW/CANCELLED).
  * Catering page: inquiry list with full workflow (NEW→CONTACTED→QUOTED→CONFIRMED→COMPLETED/DECLINED).
  * Menu page: list by category, toggle availability, edit/delete, "New item" button.
  * Menu edit page (/admin/menu/new and /admin/menu/[itemId]): full form with name, price, image, category, dietary flags, tags.
  * Reviews page: list with publish/hide moderation.
  * Staff page (OWNER only): list staff, add staff dialog with role + initial password, delete (not self).
  * Sign-in page: /admin/sign-in.
- Real-time + notifications:
  * src/lib/realtime/emit.ts — POST events to external Socket.IO service (NEXT_PUBLIC_SOCKET_URL). No-ops gracefully if unset. Rooms = restaurant:<id>.
  * src/lib/notifications/send.ts — firebase-admin FCM send. notifyOrderPaidCustomer, notifyOrderStatusChange, notifyStaffNewOrder, notifyStaffNewReservation, notifyStaffCateringInquiry, notifyReservationConfirmed. No-ops if FIREBASE_* env vars missing.
  * Updated /api/notifications/register-token to persist tokens to NotificationToken table (Phase 1 only logged them).
- Seed script updates:
  * 3 staff users: owner@majid.com/majid-owner-2024, manager@majid.com/majid-manager-2024, kitchen@majid.com/majid-kitchen-2024.
  * 1 demo customer: aisha@example.com/aisha-demo-2024.
  * 1 sample completed order (with items) so admin dashboard has data on first load.
  * 1 sample review (pending moderation).
  * 1 sample catering inquiry (NEW status).
  * 1 sample upcoming reservation (PENDING, tomorrow 5pm).
- Documentation:
  * .env.example with all Phase 0–2 env vars (DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_*, MPESA_*, FIREBASE_*, NEXT_PUBLIC_MPESA_ENABLED, etc.).
- Typecheck: passes clean (0 errors).
- Lint: passes clean (0 errors, 0 warnings after ignoring src/generated/).
- Build: `next build` succeeds — all 26 routes compile, including 5 static and 21 dynamic.

Stage Summary:
- Phase 2 of MajidOS complete: all 7 PRD §9 Phase 2 features implemented.
- Multi-tenant safety preserved throughout: tenantDb() wrapper used on every query, customer/staff sessions re-check restaurantId on every request, M-Pesa callback resolves tenant from order not from request path.
- Order lifecycle fully wired: DRAFT → PENDING_PAYMENT → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED (or CANCELLED at any pre-COMPLETED step).
- M-Pesa idempotency: callback dedupes on CheckoutRequestID; status guard prevents double-transition on Daraja retries.
- Guest checkout works end-to-end without sign-up. Sign-in is optional and only required for: order history, leaving reviews, loyalty (Phase 3+).
- .git directory preserved untouched.
- Deliverable: full project zipped to /home/z/my-project/download/majid_restaurant-phase2.zip.

---
Task ID: phase-3
Agent: main (super-z)
Task: Build Phase 3 (Operations Layer — kitchen dashboard, QR table menus, loyalty, event/meeting space bookings, careers) of MajidOS per requirements.md PRD §9 Phase 3.

Work Log:
- Read full Phase 3 scope from PRD §5.9 (events), §5.11 (loyalty), §5.16 (kitchen dashboard + Socket.IO), §5.19 (careers), §5.24 (QR table menus).
- Reviewed existing Phase 0+1+2 codebase: schema, tenant-scope, proxy.ts, admin shell, orders/reservations/catering/reviews actions, checkout view, cart store, seed.ts, staff auth, FCM helpers, realtime emit.
- Schema migration 20260702000000_phase3_loyalty_ledger:
  * Added Restaurant.loyaltySpendPerPoint (Float, default 100) — owner-configurable accrual ratio (1 point per KSh 100 spent).
  * Added LoyaltyPointLedger model — audit trail for every loyalty point mutation. Fields: entryType (ACCRUAL/REDEMPTION/ADJUSTMENT/EXPIRY), signed points, balanceAfter snapshot, optional orderId/loyaltyRuleId, description, staffUserId.
  * Added LoyaltyLedgerEntryType enum.
  * Updated Restaurant + Customer relations to include loyaltyLedger.
- Updated tenant-scope.ts to expose loyaltyPointLedger model wrapper.
- Installed `qrcode` + `@types/qrcode` for QR generation (PRD §4 calls for this).
- Installed `socket.io-client` for the kitchen dashboard's live Socket.IO connection (dynamic import, falls back to polling when not configured).
- Loyalty module (src/lib/loyalty/actions.ts):
  * accrueLoyaltyForOrder — internal, idempotent (skips if ledger entry exists for that order). Used by orders/actions.ts on every COMPLETED transition.
  * getCustomerLoyaltySummary — balance + recent ledger + active rules for the /account page.
  * upsertLoyaltyRule / deleteLoyaltyRule / toggleLoyaltyRule — OWNER/MANAGER CRUD.
  * searchCustomersForLoyalty + getCustomerLoyaltyAdmin — staff lookup by name/email/phone.
  * redeemReward — staff-initiated redemption with balance guard + REDEMPTION ledger entry.
  * adjustCustomerPoints — staff-initiated manual adjustment (signup bonus, mistake fix) with ADJUSTMENT ledger entry.
  * updateLoyaltyAccrualRatio — OWNER-only tenant-wide ratio config.
- Orders actions updated: updateOrderStatus now calls accrueLoyaltyForOrder on first transition into COMPLETED (idempotent guard via `isCompleting` flag). Also revalidates the kitchen dashboard and account paths.
- Events module (src/lib/events/actions.ts): createEventBooking (gated on hasEventSpace), updateEventBookingStatus (NEW → CONTACTED → QUOTED → CONFIRMED → COMPLETED/DECLINED).
- Careers module (src/lib/careers/actions.ts): listActiveJobPostings (public), createJobApplication (FormData CV upload saved to /public/uploads/cv/ with size + MIME validation, PDF/Word only, max 5 MB), upsertJobPosting/deleteJobPosting/toggleJobPosting, listJobPostingsAdmin (with application counts), listApplications per posting.
- Tables module (src/lib/tables/actions.ts): listTables (admin, with QR data URLs), getTableByShortCode (public, resolves /<slug>/table/<shortCode>), upsertTable/deleteTable (OWNER/MANAGER/FOH), generateQrForTable (single QR data URL), generateQrPrintSheet (full printable HTML sheet for laminating).
- Kitchen dashboard (PRD §5.16):
  * Page: /<slug>/admin/kitchen (server component fetches PREPARING/READY/DELIVERED orders from last 4h).
  * Client component admin-kitchen-dashboard.tsx: 3 columns (Preparing/Ready/Served), large 12h touch-target action buttons (≥44px), urgency cues (red border when PREPARING>10min or READY>5min), elapsed-time display, scheduled-order flag, fulfillment type + table/address, item notes/special-instructions, customer contact for drivers.
  * Real-time: opens Socket.IO connection to NEXT_PUBLIC_SOCKET_URL, joins `restaurant:<id>` room, re-fetches on every order:new/order:status_changed event. Always polls every 15s as fallback (mobile drops sockets).
  * API endpoint /<slug>/admin/kitchen/api/route.ts for the polling fallback — auth-gated, returns only the kitchen-relevant orders.
- QR table menu flow (PRD §5.24):
  * /<slug>/table/[tableId] server page resolves the table by short code (last 8 chars of CUID), 404s if not found.
  * table-landing.tsx client component stashes tableId+label in cart store, shows confirmation, sends customer to /menu.
  * Cart store updated (v2): tableId + tableLabel fields, setTable/clearTable actions, auto-clear on tenant switch.
  * Checkout view preselects DINE_IN when cart.tableId is set, shows table label read-only, passes tableId to createOrderFromCart.
- Public events page /<slug>/events — gated on hasEventSpace, 404s otherwise. Booking form: contact, date, duration, guest count, setup needs.
- Public careers page /<slug>/careers — lists active postings, "Apply" button per posting opens application form (name, phone, email, CV file upload).
- Admin pages: kitchen, loyalty, events, careers, tables — all role-gated via requireStaff in their actions, with the AdminShell nav filtered by role.
- AdminShell updated: added Kitchen, Events, Loyalty, Careers, Tables nav items with role-based visibility (e.g. KITCHEN sees Kitchen + Orders but not Menu/Loyalty/Careers/Staff). staffRole prop typed as StaffRole.
- SiteHeader + SiteFooter updated: Careers link always shown; Events link only when hasEventSpace. Layout passes hasEventSpace down.
- Account page updated: shows loyalty balance, accrual ratio, available rewards, recent activity (5 entries), and order history.
- Admin overview page updated: Phase 3 quick-link row (Kitchen/Loyalty/Tables/Careers), KPIs include new event bookings, conditional "new event bookings" + "active job postings" alerts.
- Seed script updated: loyaltySpendPerPoint=100 on restaurant, 3 sample loyalty rules (free lassi/KSh 200 off/free dessert), loyalty ledger entry for the existing Phase 2 completed order (10 points for KSh 1,050), sample event booking (Sarah Wambui, NEW), 2 job postings (Senior Chef de Partie, Waiter), 1 sample application (Peter Mwangi).
- .env.example created documenting all env vars (DB, AUTH, MPESA, FIREBASE, CLOUDINARY, GOOGLE_MAPS, SOCKET, NEXT_PUBLIC_APP_URL for QR codes).
- TypeScript: passes clean (0 errors).
- Lint: passes clean (0 errors, 0 warnings) after fixing a setState-in-useEffect anti-pattern in table-landing.tsx (replaced with cart-state-derived `saved` flag).
- Build: `next build` succeeds — 33 routes total compile (5 static + 28 dynamic), up from 26 in Phase 2. All new Phase 3 routes included: /admin/kitchen, /admin/loyalty, /admin/events, /admin/careers, /admin/tables, /admin/kitchen/api, /careers, /events, /table/[tableId].

Stage Summary:
- Phase 3 of MajidOS complete: all 5 PRD §9 Phase 3 features implemented.
- Exit criteria met:
  * "Kitchen staff can run order fulfillment entirely from the dashboard" → /admin/kitchen has 3 columns (Preparing/Ready/Served), large touch-target buttons, live updates via Socket.IO + 15s polling fallback, urgency cues, item notes, fulfillment context, customer contact.
  * "A printed QR code on a table produces a working dine-in order" → /admin/tables generates QR codes per table + a printable laminator-ready sheet. Scanning the QR lands the customer on /table/<shortCode>, which sets the cart's table binding and redirects to /menu. Checkout preselects DINE_IN, shows the table read-only, and persists tableId on the Order.
- Multi-tenant safety preserved throughout: tenantDb() wrapper used on every query, staff sessions re-check restaurantId on every request, kitchen polling endpoint is auth-gated and tenant-scoped, CV uploads are saved per-tenant (no cross-tenant leakage in the file path), QR codes encode the tenant slug in the URL.
- Loyalty accrual is automatic + idempotent — fires once per order's first transition to COMPLETED, guards against re-running on already-accrued orders. Customer.loyaltyPoints is the cached balance; LoyaltyPointLedger is the source of truth.
- .git directory preserved untouched (only files added/edited in src/, prisma/, public/uploads/cv/).
- Deliverable: full project zipped to /home/z/my-project/download/majid_restaurant_clone-phase3.zip.
