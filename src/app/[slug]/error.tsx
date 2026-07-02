"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/premium/container";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tenant route error:", error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-muted text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
        We hit an unexpected error loading this page. Please try again — if the
        problem persists, the team has been notified and is on it.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6">
        <Button onClick={reset} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </Container>
  );
}
