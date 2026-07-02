import { redirect } from "next/navigation";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getStaffSession } from "@/lib/auth/staff";
import { AdminTablesManager } from "@/components/admin/admin-tables-manager";
import { listTables } from "@/lib/tables/actions";

export const dynamic = "force-dynamic";

/**
 * Admin Tables & QR codes page (PRD §5.24).
 *
 * Lets staff:
 *   - Add / edit / delete tables (label, capacity, location)
 *   - View a QR code per table (rendered inline as a data URL)
 *   - Print a one-page sheet of all QR codes for laminating
 *
 * Auth: any staff role can view. OWNER/MANAGER/FRONT_OF_HOUSE can edit.
 */
export default async function AdminTablesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await getContextRestaurant();
  const session = await getStaffSession();
  if (!session) redirect(`/${slug}/admin/sign-in`);

  const tables = await listTables();

  return (
    <AdminTablesManager
      slug={slug}
      staffRole={session.role}
      initialTables={tables}
    />
  );
}

export async function generateMetadata() {
  return { title: "Tables & QR codes" };
}
