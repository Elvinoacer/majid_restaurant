/**
 * Client-side flag for "is M-Pesa configured for this deployment?". Used by
 * the checkout UI to decide whether to show M-Pesa as a payment option.
 *
 * Server-side the same check is `isMpesaConfigured()` in
 * `src/lib/mpesa/daraja.ts`. We expose it to the client via a public env
 * var so the checkout page doesn't need to make a round-trip.
 */
export function isMpesaConfiguredClient(): boolean {
  return process.env.NEXT_PUBLIC_MPESA_ENABLED === "true";
}
