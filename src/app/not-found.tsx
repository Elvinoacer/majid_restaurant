import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEFAULT_TENANT_SLUG } from "@/proxy";

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        Restaurant not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The restaurant you&apos;re looking for doesn&apos;t exist on this platform.
      </p>
      <Button asChild className="mt-6">
        <Link href={`/${DEFAULT_TENANT_SLUG}`}>Back to Majid Restaurant</Link>
      </Button>
    </div>
  );
}
