import Link from "next/link";
import { Home, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";
import { DEFAULT_TENANT_SLUG } from "@/proxy";

export default function GlobalNotFound() {
  return (
    <Container className="flex min-h-screen flex-col items-center justify-center py-16 text-center">
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
        Restaurant not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
        The restaurant you&apos;re looking for doesn&apos;t exist on this platform,
        or the link may be broken.
      </p>
      <div className="mt-6">
        <Button asChild className="gap-1.5">
          <Link href={`/${DEFAULT_TENANT_SLUG}`}>
            <Home className="h-4 w-4" />
            Back to Majid Restaurant
          </Link>
        </Button>
      </div>
    </Container>
  );
}
