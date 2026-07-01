import { AdminCateringList } from "@/components/admin/admin-catering-list";
import { getContextRestaurant } from "@/lib/restaurant/context";

export const dynamic = "force-dynamic";

export default async function AdminCateringPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db: tenant } = await getContextRestaurant();

  const inquiries = await tenant.cateringInquiry.findMany({
    orderBy: [{ status: "asc" }, { eventDate: "asc" }],
    take: 100,
  });

  const serialized = inquiries.map((i) => ({
    id: i.id,
    status: i.status,
    contactName: i.contactName,
    contactPhone: i.contactPhone,
    contactEmail: i.contactEmail,
    eventDate: i.eventDate.toISOString(),
    guestCount: i.guestCount,
    budgetRange: i.budgetRange,
    preferredCuisine: i.preferredCuisine,
    eventType: i.eventType,
    notes: i.notes,
    createdAt: i.createdAt.toISOString(),
  }));

  return <AdminCateringList inquiries={serialized} />;
}

export async function generateMetadata() {
  return { title: "Catering" };
}
