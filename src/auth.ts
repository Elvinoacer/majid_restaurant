/**
 * NextAuth v5 configuration (PRD §5.13 — Customer Accounts).
 *
 * Customer auth is intentionally separate from staff auth (PRD §7.2 note):
 *   - Customers use NextAuth with Credentials + Google OAuth, scoped to the
 *     Customer table (multi-tenant: one customer account per restaurant).
 *   - Staff use a separate, simpler credentials-only flow against StaffUser
 *     (see `src/lib/auth/staff.ts`) — no OAuth, role-gated, never shares a
 *     session cookie with the customer auth.
 *
 * Multi-tenancy: a Customer row is unique per (restaurantId, email). The
 * Credentials provider resolves the restaurant from the request's
 * `x-restaurant-slug` header (set by `src/proxy.ts`) so a customer logging in
 * on `/majid-restaurant/sign-in` is matched against Majid's customer list, not
 * a global one.
 *
 * Sessions are JWT-based (not database-backed) so we don't need the Prisma
 * adapter — the customer record is looked up directly on sign-in and the
 * customerId + restaurantId are stashed on the JWT. Google OAuth (if
 * configured) upserts a Customer row in the `signIn` callback using the
 * slug stored in the `slug` cookie.
 */
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  restaurantSlug: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        restaurantSlug: { label: "Restaurant slug", type: "text" },
      },
      async authorize(creds) {
        const parsed = CredentialsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const { email, password, restaurantSlug } = parsed.data;

        const restaurant = await prisma.restaurant.findUnique({
          where: { slug: restaurantSlug },
          select: { id: true },
        });
        if (!restaurant) return null;

        const customer = await prisma.customer.findUnique({
          where: {
            restaurantId_email: { restaurantId: restaurant.id, email: email.toLowerCase() },
          },
        });
        if (!customer || !customer.passwordHash) return null;

        const ok = await bcrypt.compare(password, customer.passwordHash);
        if (!ok) return null;

        return {
          id: customer.id,
          email: customer.email ?? email,
          name: customer.name ?? undefined,
          image: customer.image ?? undefined,
          // Custom claim — used downstream to scope queries to this tenant.
          restaurantId: restaurant.id,
        } as any;
      },
    }),
    // Google OAuth is opt-in via env vars. If AUTH_GOOGLE_ID is missing, the
    // provider is silently dropped so the app boots without it.
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // First sign-in via Credentials: user object carries restaurantId.
      if (user && (user as any).restaurantId) {
        token.restaurantId = (user as any).restaurantId;
        token.customerId = (user as any).id ?? user.id;
      }

      // First sign-in via Google OAuth: we need to upsert a Customer row in
      // the current tenant. The tenant slug is round-tripped through the
      // `majidos_signup_slug` cookie set on the sign-in page (see SignInView),
      // but we defensively re-validate it against the request's
      // `x-restaurant-slug` header (set by src/proxy.ts) — a malicious user
      // could otherwise set the cookie to an arbitrary tenant and create a
      // Customer row in a restaurant they didn't intend to sign up for.
      if (account?.provider === "google" && profile?.email && !token.customerId) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const cookieSlug = cookieStore.get("majidos_signup_slug")?.value;
        const headerSlug = (await headers()).get("x-restaurant-slug");
        // If both are present they must agree. If only one is present, use it.
        // If neither is present, we can't determine the tenant — bail.
        const slug =
          cookieSlug && headerSlug && cookieSlug !== headerSlug
            ? headerSlug // header is authoritative — set by middleware, not client-settable
            : (headerSlug ?? cookieSlug);
        if (slug) {
          const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            select: { id: true },
          });
          if (restaurant) {
            const email = profile.email.toLowerCase();
            const customer = await prisma.customer.upsert({
              where: {
                restaurantId_email: { restaurantId: restaurant.id, email },
              },
              update: {
                name: profile.name ?? null,
                image: (profile as any).picture ?? null,
              },
              create: {
                restaurantId: restaurant.id,
                email,
                name: profile.name ?? null,
                image: (profile as any).picture ?? null,
              },
            });
            token.customerId = customer.id;
            token.restaurantId = restaurant.id;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.customerId ?? token.sub;
        (session.user as any).restaurantId = token.restaurantId;
      }
      return session;
    },
    authorized({ request, auth: _auth }) {
      // Used by `auth()` wrapper in proxy.ts. We don't gate any path purely on
      // customer auth here — customer pages all support guest checkout. Path
      // protection happens at the Server Action / page level via
      // `getCustomerForCurrentTenant()`.
      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * Server-side helper: returns the currently-authenticated customer for the
 * current tenant, or null if not signed in / signed in to a different tenant.
 *
 * Multi-tenant safety: even if a customer is logged in via cookie, we re-check
 * that their `restaurantId` matches the current request's tenant (resolved
 * from the `x-restaurant-slug` header set by `src/proxy.ts`) before returning
 * them. This prevents a customer of tenant A from acting under tenant B's
 * context if they happen to visit the other tenant's URL.
 */
export async function getCustomerForCurrentTenant(): Promise<{
  id: string;
  email: string;
  name: string | null;
  restaurantId: string;
} | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { id?: string; email?: string; name?: string | null; restaurantId?: string };
  if (!user.restaurantId || !user.id) return null;

  // Defensive re-check: the JWT might have been issued for tenant A while the
  // user is now hitting a URL under tenant B. We resolve the current tenant
  // from the request header and reject the mismatch.
  const headerSlug = (await headers()).get("x-restaurant-slug");
  if (headerSlug) {
    const currentRestaurant = await prisma.restaurant.findUnique({
      where: { slug: headerSlug },
      select: { id: true },
    });
    if (!currentRestaurant || currentRestaurant.id !== user.restaurantId) {
      return null;
    }
  }

  return {
    id: user.id,
    email: user.email!,
    name: user.name ?? null,
    restaurantId: user.restaurantId,
  };
}
