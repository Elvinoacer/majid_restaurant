import { ReviewForm } from "@/components/reviews/review-form";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { getOrderForCustomer } from "@/lib/orders/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug } = await params;
  const { orderId } = await params;
  await getContextRestaurant();
  const order = await getOrderForCustomer(orderId);

  if (!order) notFound();
  if (order.status !== "COMPLETED") {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h2 className="font-display text-xl font-semibold">Order not completed yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You can leave a review once the order is marked as completed.
        </p>
      </div>
    );
  }

  const itemName = order.items[0]?.menuItem.name ?? "your order";

  return <ReviewForm slug={slug} orderId={orderId} itemName={itemName} />;
}

export async function generateMetadata() {
  return { title: "Leave a review" };
}
