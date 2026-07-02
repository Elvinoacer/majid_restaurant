import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";
import { AdminLoyaltyManager } from "@/components/admin/admin-loyalty-manager";

export const dynamic = "force-dynamic";

/**
 * Loyalty admin page (PRD §5.11).
 *
 * OWNER/MANAGER: full CRUD on LoyaltyRule + accrual ratio config.
 * FRONT_OF_HOUSE: read-only on rules + can search customers & redeem rewards
 * (no manual adjustment, no ratio config).
 * KITCHEN: blocked (kitchen staff don't interact with loyalty).
 */
export default async function AdminLoyaltyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant, db: tenant } = await getContextRestaurant();
  const session = await getStaffSession();

  // Block KITCHEN — they have no business here.
  if (session?.role === "KITCHEN") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Loyalty management isn&apos;t available for kitchen staff.
      </div>
    );
  }

  const rules = await tenant.loyaltyRule.findMany({
    orderBy: [{ isActive: "desc" }, { pointsRequired: "asc" }],
  });

  const serializedRules = rules.map((r) => ({
    id: r.id,
    description: r.description,
    pointsRequired: r.pointsRequired,
    spendThreshold: r.spendThreshold,
    rewardDescription: r.rewardDescription,
    isActive: r.isActive,
  }));

  return (
    <AdminLoyaltyManager
      slug={slug}
      restaurantName={restaurant.name}
      staffRole={session?.role ?? "MANAGER"}
      spendPerPoint={restaurant.loyaltySpendPerPoint}
      initialRules={serializedRules}
    />
  );
}

export async function generateMetadata() {
  return { title: "Loyalty" };
}
