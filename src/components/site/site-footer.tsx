import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

type SiteFooterProps = {
  slug: string;
  restaurantName: string;
  phone: string;
  email?: string | null;
  address: string;
  whatsappPhone: string;
};

export function SiteFooter({
  slug,
  restaurantName,
  phone,
  email,
  address,
  whatsappPhone,
}: SiteFooterProps) {
  const base = `/${slug}`;
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        {/* About */}
        <div>
          <h3 className="font-display text-base font-bold text-foreground">
            {restaurantName}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Nakuru&apos;s home of biryani. Owned and operated digital presence
            powered by MajidOS — a customer acquisition &amp; operations platform
            by GTSS.
          </p>
        </div>

        {/* Quick links */}
        <nav className="flex flex-col gap-2" aria-label="Footer">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explore
          </h3>
          <Link href={base} className="text-sm text-foreground/80 hover:text-accent">
            Home
          </Link>
          <Link href={`${base}/menu`} className="text-sm text-foreground/80 hover:text-accent">
            Menu
          </Link>
          <Link href={`${base}/gallery`} className="text-sm text-foreground/80 hover:text-accent">
            Gallery
          </Link>
          <Link href={`${base}/about`} className="text-sm text-foreground/80 hover:text-accent">
            About Us
          </Link>
          <Link href={`${base}/contact`} className="text-sm text-foreground/80 hover:text-accent">
            Contact
          </Link>
        </nav>

        {/* Contact */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </h3>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-accent"
          >
            <Phone className="h-4 w-4" />
            {phone}
          </a>
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-accent"
            >
              <Mail className="h-4 w-4" />
              {email}
            </a>
          )}
          <a
            href={`https://wa.me/${whatsappPhone.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-accent"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp order
          </a>
          <span className="inline-flex items-start gap-2 text-sm text-foreground/80">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {address}
          </span>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {restaurantName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-accent">MajidOS</span> · GTSS
          </p>
        </div>
      </div>
    </footer>
  );
}
