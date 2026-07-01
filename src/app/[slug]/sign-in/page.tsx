import { SignInView } from "@/components/account/sign-in-view";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <SignInView slug={slug} />
    </Suspense>
  );
}

export async function generateMetadata() {
  return { title: "Sign in" };
}
