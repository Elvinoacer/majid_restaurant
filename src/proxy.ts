/**
 * Multi-tenant middleware (PRD §5.1).
 *
 * Resolves the restaurant slug from the first path segment of every request
 * and attaches a response header (`x-restaurant-slug`) so downstream Server
 * Components / Server Actions can read it via the request headers.
 *
 * Inside RSCs and Server Actions we use `headers()` to read this back, which
 * avoids any global mutable state and works cleanly under Vercel's serverless
 * model where each request is isolated.
 *
 * Exempt prefixes (do not get tenant resolution):
 *   - /_next, /favicon, /logo, /robots — Next/asset internals
 *   - /api/health — platform health probes
 *
 * Tenant-aware routes:
 *   - /                    -> redirect to /<DEFAULT_TENANT_SLUG>
 *   - /<slug>              -> tenant home
 *   - /<slug>/menu         -> tenant menu
 *   - /<slug>/about        -> about
 *   - /<slug>/contact      -> contact
 *   - /<slug>/gallery      -> gallery
 */
import { NextResponse, type NextRequest } from "next/server";

export const DEFAULT_TENANT_SLUG = "majid-restaurant";

const EXEMPT_PREFIXES = ["/_next", "/favicon", "/logo", "/robots", "/api/health"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip asset/internal paths entirely.
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

  // Skip API routes (they handle their own tenancy).
  if (slug === "api") {
    return NextResponse.next();
  }

  // Attach slug to request headers so RSCs / Actions can read it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-restaurant-slug", slug);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Also set on the response for client-side fetch helpers.
  res.headers.set("x-restaurant-slug", slug);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
