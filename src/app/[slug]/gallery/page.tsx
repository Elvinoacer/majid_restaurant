import { ImageIcon } from "lucide-react";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { EmptyState } from "@/components/premium/empty-state";

export const dynamic = "force-dynamic";

/**
 * Tenant gallery page (PRD §5.20).
 */
export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();
  const images = await tenant.galleryImage.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <Container className="py-6 sm:py-10">
      <PageHeader
        title="Gallery"
        subtitle={`A peek at ${restaurant.name}'s food, dining room, and people.`}
      />

      {images.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-7 w-7" />}
          title="No images yet"
          description="Photos of our food and space will appear here soon."
        />
      ) : (
        <GalleryGrid images={images} />
      )}
    </Container>
  );
}

export async function generateMetadata() {
  return {
    title: "Gallery",
    description: "A peek at our food, our dining room, and our people.",
  };
}
