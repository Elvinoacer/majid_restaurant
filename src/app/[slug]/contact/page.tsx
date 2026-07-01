import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { EmbeddedMap } from "@/components/site/embedded-map";
import {
  computeOpenStatus,
  fetchHoursForRestaurant,
  dayName,
} from "@/lib/restaurant/hours";

export const dynamic = "force-dynamic";

/**
 * Contact page (PRD §5.21).
 *
 * Aggregates phone, email, WhatsApp, address, embedded map, hours — a summary
 * view pulling from restaurant settings rather than separately-maintained copy.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();
  const { weekly, overrides } = await fetchHoursForRestaurant(restaurant.id);
  const hoursToday = computeOpenStatus(weekly, overrides, new Date(), restaurant.timezone);

  const whatsappUrl = `https://wa.me/${restaurant.whatsappPhone.replace(/[^\d]/g, "")}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Reach us directly — we&apos;re here every day from 7am to 10pm.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Contact methods */}
        <div className="space-y-4">
          <ContactRow
            icon={<Phone className="h-5 w-5" />}
            label="Phone"
            value={restaurant.contactPhone}
            href={`tel:${restaurant.contactPhone.replace(/\s/g, "")}`}
          />
          {restaurant.contactEmail && (
            <ContactRow
              icon={<Mail className="h-5 w-5" />}
              label="Email"
              value={restaurant.contactEmail}
              href={`mailto:${restaurant.contactEmail}`}
            />
          )}
          <ContactRow
            icon={<MessageCircle className="h-5 w-5" />}
            label="WhatsApp"
            value={`Order via WhatsApp — opens chat with our team`}
            href={whatsappUrl}
            external
          />
          <ContactRow
            icon={<MapPin className="h-5 w-5" />}
            label="Address"
            value={restaurant.address}
          />

          {/* Hours */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              <h2 className="font-display text-lg font-semibold text-foreground">
                Opening Hours
              </h2>
              <span
                className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  hoursToday.isOpenNow
                    ? "bg-green-500/15 text-green-700"
                    : "bg-red-500/15 text-red-700"
                }`}
              >
                {hoursToday.isOpenNow ? "Open now" : "Closed"}
              </span>
            </div>
            <ul className="space-y-1 text-sm">
              {weekly.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-3 border-b border-border/40 py-1 last:border-0"
                >
                  <span className="text-foreground/80">{dayName(h.dayOfWeek)}</span>
                  <span className="text-muted-foreground">
                    {h.isClosed
                      ? "Closed"
                      : `${h.openTime} – ${h.closeTime}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Map */}
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Find Us
          </h2>
          <EmbeddedMap
            name={restaurant.name}
            address={restaurant.address}
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            parkingInfo={restaurant.parkingInfo}
          />
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="block"
      >
        {content}
      </a>
    );
  }
  return content;
}

export async function generateMetadata() {
  return {
    title: "Contact",
    description: "Get in touch — phone, WhatsApp, address, and opening hours.",
  };
}
