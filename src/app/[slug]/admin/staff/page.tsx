import { AdminStaffList } from "@/components/admin/admin-staff-list";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db: tenant } = await getContextRestaurant();
  const session = await getStaffSession();

  // Only OWNER sees this page; requireStaff is enforced inside actions, but
  // we also gate the page itself to avoid showing the form to non-owners.
  if (session?.role !== "OWNER") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="font-display text-lg font-semibold">Owner only</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only the restaurant owner can manage staff accounts.
        </p>
      </div>
    );
  }

  const staff = await tenant.staffUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  const serialized = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  }));

  return <AdminStaffList staff={serialized} currentStaffId={session.staffUserId} />;
}

export async function generateMetadata() {
  return { title: "Staff" };
}
