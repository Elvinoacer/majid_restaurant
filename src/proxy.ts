/**
 * Multi-tenant proxy / middleware (PRD §5.1).
 *
 * Next.js 16 renames the `middleware.ts` concept to `proxy.ts`. This file
 * composes two concerns:
 *
 *   1. Tenant resolution — extracts the restaurant slug from the first path
 *      segment of every request and attaches it as a request header
 *      (`x-restaurant-slug`) so downstream Server Components / Server Actions
 *      can read it via `headers()`.
 *
 *   2. NextAuth v5 — wraps the request in `auth()` so `auth()` is available
 *      inside Server Components / Server Actions for this request without a
 *      separate DB lookup. Customer auth is *not* used to gate any path here
 *      — every customer page supports guest checkout. The wrapper is purely
 *      to populate the session.
 *
 * Exempt prefixes (do not get tenant resolution):
 *   - /_next, /favicon, /logo, /robots — Next/asset internals
 *   - /api/health — platform health probes
 *   - /api/auth — NextAuth's own endpoints (must not be tenant-scoped)
 *   - /api/mpesa — Daraja callback (uses its own idempotency, no tenant
 *                  header — the order's restaurantId is looked up from the
 *                  CheckoutRequestID)
 *
 * Tenant-aware routes:
 *   - /                    -> redirect to /<DEFAULT_TENANT_SLUG>
 *   - /<slug>              -> tenant home
 *   - /<slug>/menu         -> tenant menu
 *   - /<slug>/about        -> about
 *   - /<slug>/contact      -> contact
 *   - /<slug>/gallery      -> gallery
 *   - /<slug>/cart         -> cart (Phase 2)
 *   - /<slug>/checkout     -> checkout (Phase 2)
 *   - /<slug>/orders/...   -> customer order history & status (Phase 2)
 *   - /<slug>/reservations -> reservation form (Phase 2)
 *   - /<slug>/catering     -> catering inquiry form (Phase 2)
 *   - /<slug>/admin/...    -> staff admin dashboard (Phase 2)
 *   - /<slug>/account/...  -> customer account pages (Phase 2)
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { jwtVerify } from "jose";
import { isRouteAllowedForRole, ROLE_DEFAULT_ROUTES, type StaffRole } from "@/lib/auth/roles";

const ALG = "HS256";
function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error("AUTH_SECRET is required for staff session signing");
  }
  return new TextEncoder().encode(s);
}
export const DEFAULT_TENANT_SLUG = "majid-restaurant";

const EXEMPT_PREFIXES = [
  "/_next",
  "/favicon",
  "/logo",
  "/robots",
  "/api/health",
  "/api/auth",
  "/api/mpesa",
];

export default auth(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // Skip asset/internal/auth/webhook paths entirely.
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Root -> default tenant.
  if (pathname === "/" || pathname === "") {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_TENANT_SLUG}`;
    return NextResponse.redirect(url);
  }

  // Extract slug from first segment.
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];

  // Skip API routes (they handle their own tenancy via body or path).
  if (slug === "api") {
    return NextResponse.next();
  }

  // RBAC for admin routes
  if (segments[1] === "admin" && !pathname.endsWith("/admin/sign-in")) {
    const cookie = req.cookies.get("majidos_staff_session")?.value;
    if (!cookie) {
      const url = req.nextUrl.clone();
      url.pathname = `/${slug}/admin/sign-in`;
      return NextResponse.redirect(url);
    }
    try {
      const { payload } = await jwtVerify(cookie, getSecret(), { algorithms: [ALG] });
      const role = payload.role as StaffRole;
      if (!isRouteAllowedForRole(pathname, role)) {
        const defaultRoute = ROLE_DEFAULT_ROUTES[role] || "/admin";
        const url = req.nextUrl.clone();
        url.pathname = `/${slug}${defaultRoute}`;
        return NextResponse.redirect(url);
      }
    } catch {
      // Invalid JWT
      const url = req.nextUrl.clone();
      url.pathname = `/${slug}/admin/sign-in`;
      return NextResponse.redirect(url);
    }
  }

  // Attach slug to request headers so RSCs / Actions can read it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-restaurant-slug", slug);
  requestHeaders.set("x-pathname", pathname);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Also set on the response for client-side fetch helpers.
  res.headers.set("x-restaurant-slug", slug);
  return res;
});

export const config = {
  // Skip Next internals and static assets. Everything else flows through
  // the proxy so tenant context is always set.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
