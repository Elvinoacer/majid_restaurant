import { notFound } from "next/navigation";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getTableByShortCode } from "@/lib/tables/actions";
import { TableLanding } from "@/components/qr/table-landing";

export const dynamic = "force-dynamic";

/**
 * QR-scanned table landing page (PRD §5.24).
 *
 * Resolves the table by its short code (the last 8 chars of its CUID,
 * encoded in the QR URL). If the table doesn't exist or doesn't belong to
 * this tenant, 404.
 *
 * No auth required — this is a public page. The cart store binding happens
 * client-side; we just need to pass the table info down.
 */
export default async function TableLandingPage({
  params,
}: {
  params: Promise<{ slug: string; tableId: string }>;
}) {
  const { slug, tableId } = await params;
  const { restaurant } = await getContextRestaurant();

  const table = await getTableByShortCode(tableId);
  if (!table) {
    notFound();
  }

  return (
    <TableLanding
      slug={slug}
      tableId={table.id}
      tableLabel={table.label}
      restaurantName={restaurant.name}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; tableId: string }>;
}) {
  const { tableId } = await params;
  const table = await getTableByShortCode(tableId);
  return {
    title: table ? `Order from ${table.label}` : "Table not found",
  };
}
