import { CartView } from "@/components/cart/cart-view";

export const dynamic = "force-dynamic";

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CartView slug={slug} />;
}

export async function generateMetadata() {
  return { title: "Cart" };
}
