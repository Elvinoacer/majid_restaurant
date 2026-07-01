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
