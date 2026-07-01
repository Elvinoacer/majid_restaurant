import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RestaurantNotFoundError, getContextRestaurant } from "@/lib/restaurant/context";

export const dynamic = "force-dynamic";

/**
 * Per-tenant layout (PRD §5.1).
 *
 * Resolves the tenant from the slug (set by middleware → header), then
 * wraps every page in that tenant's header / footer. If the slug doesn't
 * resolve to a restaurant, we render Next's notFound() — handled by the
 * nearest `not-found.tsx`.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let ctx;
  try {
    ctx = await getContextRestaurant();
  } catch (e) {
    if (e instanceof RestaurantNotFoundError) {
      notFound();
    }
    throw e;
  }

  const { restaurant } = ctx;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        slug={slug}
        restaurantName={restaurant.name}
        logoUrl={restaurant.logoUrl}
        phone={restaurant.contactPhone}
        address={restaurant.address}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter
        slug={slug}
        restaurantName={restaurant.name}
        phone={restaurant.contactPhone}
        email={restaurant.contactEmail}
        address={restaurant.address}
        whatsappPhone={restaurant.whatsappPhone}
      />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return {};
  return {
    title: {
      default: `${restaurant.name} — ${restaurant.tagline ?? "Order online"}`,
      template: `%s · ${restaurant.name}`,
    },
    description: restaurant.description ?? restaurant.tagline ?? undefined,
    openGraph: {
      title: restaurant.name,
      description: restaurant.tagline ?? undefined,
      images: restaurant.coverImageUrl ? [{ url: restaurant.coverImageUrl }] : undefined,
    },
  };
}
