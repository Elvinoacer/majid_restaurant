import { AdminReviewsList } from "@/components/admin/admin-reviews-list";
import { getContextRestaurant } from "@/lib/restaurant/context";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db: tenant } = await getContextRestaurant();

  const reviews = await tenant.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { select: { name: true, email: true } } },
  });

  const serialized = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    isPublished: r.isPublished,
    createdAt: r.createdAt.toISOString(),
    customer: r.customer
      ? { name: r.customer.name, email: r.customer.email }
      : null,
  }));

  return <AdminReviewsList reviews={serialized} />;
}

export async function generateMetadata() {
  return { title: "Reviews" };
}
