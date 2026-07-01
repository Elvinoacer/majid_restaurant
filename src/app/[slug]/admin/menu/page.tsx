import { AdminMenuList } from "@/components/admin/admin-menu-list";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { parseTags } from "@/lib/db/serialize";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db: tenant } = await getContextRestaurant();

  const categories = await tenant.menuCategory.findMany({
    where: {},
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  const serialized = categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.price,
      imageUrl: i.imageUrl,
      isAvailable: i.isAvailable,
      isPopular: i.isPopular,
      isVegetarian: i.isVegetarian,
      isVegan: i.isVegan,
      isSpicy: i.isSpicy,
      isHalal: i.isHalal,
      category: { id: c.id, name: c.name },
      tags: parseTags((i as any).tagsJson),
    })),
  }));

  return <AdminMenuList slug={slug} categories={serialized} />;
}

export async function generateMetadata() {
  return { title: "Menu" };
}
