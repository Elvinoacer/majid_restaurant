import { CateringForm } from "@/components/catering/catering-form";

export const dynamic = "force-dynamic";

export default async function CateringPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CateringForm slug={slug} />;
}

export async function generateMetadata() {
  return { title: "Catering inquiry" };
}
