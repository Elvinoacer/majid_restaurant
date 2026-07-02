"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, Utensils, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { useParams } from "next/navigation";

export default function NotFound() {
  // Read the slug from the URL so this 404 works for any tenant.
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? "";
  const base = slug ? `/${slug}` : "/";

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <p className="font-display text-7xl font-bold tracking-tight text-primary sm:text-8xl">
          404
        </p>
        <UtensilsCrossed
          className="absolute -right-6 -top-2 h-8 w-8 rotate-12 text-accent"
          aria-hidden
        />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        Let&apos;s get you back to something delicious.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild className="gap-1.5">
          <Link href={base}>
            <Home className="h-4 w-4" />
            Back home
          </Link>
        </Button>
        {slug && (
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={`${base}/menu`}>
              <Utensils className="h-4 w-4" />
              Browse menu
            </Link>
          </Button>
        )}
      </div>
    </Container>
  );
}
