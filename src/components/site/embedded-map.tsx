"use client";

import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmbeddedMapProps = {
  /** Full street address for the "Get directions" deep link */
  address: string;
  latitude: number;
  longitude: number;
  parkingInfo?: string | null;
  /** Restaurant name — used in the deep link query for clarity */
  name: string;
};

/**
 * Google Maps integration (PRD §5.7).
 *
 * v1 uses the no-API-key embed via `https://www.google.com/maps?q=...&output=embed`
 * which works without an API key and is sufficient for a Phase 1 demo. When
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is provisioned in a later phase, swap to
 * the JS API for interactive markers / nearby-place search.
 *
 * One-click directions deep-links to Google Maps app on mobile / web Maps on desktop.
 */
export function EmbeddedMap({
  address,
  latitude,
  longitude,
  parkingInfo,
  name,
}: EmbeddedMapProps) {
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${name} ${address}`,
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${name}, ${address}`,
  )}`;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          title={`Map showing ${name} location`}
          src={embedSrc}
          className="h-64 w-full sm:h-72"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
          <div>
            <p className="text-foreground">{address}</p>
            {parkingInfo && (
              <p className="mt-1 text-xs text-muted-foreground">{parkingInfo}</p>
            )}
          </div>
        </div>

        <Button asChild variant="default" size="sm" className="shrink-0">
          <a href={directionsUrl} target="_blank" rel="noreferrer">
            <Navigation className="mr-1.5 h-4 w-4" />
            Get Directions
          </a>
        </Button>
      </div>
    </div>
  );
}
