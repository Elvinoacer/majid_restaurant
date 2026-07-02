"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Home, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  // Read the slug from the URL so this 404 works for any tenant, not just
  // the hardcoded `majid-restaurant`. Falls back to root if absent.
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? "";
  const base = slug ? `/${slug}` : "/";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href={base}>
            <Home className="mr-1.5 h-4 w-4" />
            Back home
          </Link>
        </Button>
        {slug && (
          <Button asChild variant="secondary">
            <Link href={`${base}/menu`}>
              <Utensils className="mr-1.5 h-4 w-4" />
              Browse menu
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
