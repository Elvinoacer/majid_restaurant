"use client";

/**
 * Global error boundary (PRD §6 — non-functional: graceful error handling).
 *
 * Catches errors that escape the root layout itself (the regular
 * `error.tsx` boundary cannot, because it lives inside the root layout).
 * Renders a minimal branded page — no header/footer since the layout that
 * provides them is the thing that crashed.
 */
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the console for dev; production should forward to a monitoring
    // service via a `reportError` hook when one is wired up.
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "oklch(0.985 0.008 85)",
          color: "oklch(0.22 0.01 70)",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "3rem 1rem",
            textAlign: "center",
          }}
        >
          <AlertTriangle
            size={48}
            strokeWidth={1.5}
            style={{ color: "oklch(0.55 0.13 38)", marginBottom: "1rem" }}
            aria-hidden
          />
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              maxWidth: "28rem",
              fontSize: "0.875rem",
              color: "oklch(0.50 0.02 70)",
              marginBottom: "1.5rem",
            }}
          >
            We&apos;ve been notified. Please try again — if the problem
            persists, refresh the page or come back in a few minutes.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "oklch(0.50 0.02 70)",
                marginBottom: "1.5rem",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
