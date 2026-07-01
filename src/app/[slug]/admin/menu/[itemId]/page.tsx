import { MenuItemForm } from "@/components/admin/menu-item-form";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { parseTags } from "@/lib/db/serialize";

export const dynamic = "force-dynamic";

type ItemSnap = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  isAvailable: boolean;
  isPopular: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isHalal: boolean;
  tags: string[];
  mealBuilderStage: string | null;
};

export default async function MenuItemEditPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug } = await params;
  const { itemId } = await params;
  const { db: tenant } = await getContextRestaurant();

  const categories = await tenant.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  let item: ItemSnap | null = null;
  if (itemId !== "new") {
    const found = await tenant.menuItem.findUnique({ where: { id: itemId } });
    if (found) {
      item = {
        id: found.id,
        name: found.name,
        description: found.description,
        price: found.price,
        imageUrl: found.imageUrl,
        categoryId: found.categoryId,
        isAvailable: found.isAvailable,
        isPopular: found.isPopular,
        isVegetarian: found.isVegetarian,
        isVegan: found.isVegan,
        isSpicy: found.isSpicy,
        isHalal: found.isHalal,
        tags: parseTags((found as any).tagsJson),
        mealBuilderStage: found.mealBuilderStage,
      };
    }
  }

  return <MenuItemForm slug={slug} item={item} categories={categories} />;
}

export async function generateMetadata() {
  return { title: "Edit menu item" };
}

