import { getContextRestaurant } from "@/lib/restaurant/context";
import { listActiveJobPostings } from "@/lib/careers/actions";
import { CareersList } from "@/components/careers/careers-list";

export const dynamic = "force-dynamic";

/**
 * Public careers page (PRD §5.19).
 *
 * Lists active job postings and lets a candidate apply with a CV upload.
 * Applications land in the admin dashboard as a distinct list.
 */
export default async function CareersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant } = await getContextRestaurant();
  const postings = await listActiveJobPostings();

  return (
    <CareersList
      slug={slug}
      restaurantName={restaurant.name}
      postings={postings}
    />
  );
}

export async function generateMetadata() {
  return { title: "Careers" };
}
