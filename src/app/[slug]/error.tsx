"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="font-display text-4xl font-bold text-accent">Oops</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We hit an unexpected error loading this page. Please try again — if the
        problem persists, the team has been notified.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
