import { GalleryGrid } from "@/components/site/gallery-grid";
import { getContextRestaurant } from "@/lib/restaurant/context";

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Gallery
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A peek at {restaurant.name}&apos;s food, dining room, and people.
        </p>
      </header>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No images yet.
        </div>
      ) : (
        <GalleryGrid images={images} />
      )}
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: "Gallery",
    description: "A peek at our food, our dining room, and our people.",
  };
}
