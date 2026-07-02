import { getContextRestaurant } from "@/lib/restaurant/context";
import { listJobPostingsAdmin } from "@/lib/careers/actions";
import { AdminCareersManager } from "@/components/admin/admin-careers-manager";

export const dynamic = "force-dynamic";

export default async function AdminCareersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant } = await getContextRestaurant();
  const postings = await listJobPostingsAdmin();

  return (
    <AdminCareersManager
      slug={slug}
      restaurantName={restaurant.name}
      initialPostings={postings}
    />
  );
}

export async function generateMetadata() {
  return { title: "Careers" };
}
