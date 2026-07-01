import { CheckoutView } from "@/components/checkout/checkout-view";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CheckoutView slug={slug} />;
}

export async function generateMetadata() {
  return { title: "Checkout" };
}
