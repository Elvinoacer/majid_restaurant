import { StaffSignInForm } from "@/components/admin/staff-sign-in-form";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StaffSignInForm slug={slug} />;
}

export async function generateMetadata() {
  return { title: "Staff sign in" };
}
