import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  Instagram,
  Facebook,
  Twitter,
} from "lucide-react";
import { Logo } from "@/components/premium/logo";

type SiteFooterProps = {
  slug: string;
  restaurantName: string;
  logoUrl?: string | null;
  phone: string;
  email?: string | null;
  address: string;
  whatsappPhone: string;
  hasEventSpace?: boolean;
  comboBuilderEnabled?: boolean;
};

export function SiteFooter({
  slug,
  restaurantName,
  logoUrl,
  phone,
  email,
  address,
  whatsappPhone,
  hasEventSpace,
  comboBuilderEnabled,
}: SiteFooterProps) {
  const base = `/${slug}`;
  const year = new Date().getFullYear();

  const exploreLinks = [
    { href: base, label: "Home" },
    { href: `${base}/menu`, label: "Menu" },
    { href: `${base}/recommend`, label: "Recommend a dish" },
    comboBuilderEnabled && { href: `${base}/meal-builder`, label: "Build a combo" },
    { href: `${base}/reservations`, label: "Reservations" },
    { href: `${base}/catering`, label: "Catering" },
    hasEventSpace && { href: `${base}/events`, label: "Event space" },
    { href: `${base}/gallery`, label: "Gallery" },
    { href: `${base}/about`, label: "About us" },
    { href: `${base}/contact`, label: "Contact" },
    { href: `${base}/careers`, label: "Careers" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="mt-auto border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand block */}
          <div className="md:col-span-4">
            <Logo
              restaurantName={restaurantName}
              logoUrl={logoUrl}
              size="md"
              showName
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Nakuru&apos;s home of biryani. Owned and operated, with a digital
              presence powered by MajidOS — a customer acquisition &amp;
              operations platform by GTSS.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <SocialLink
                href={`https://wa.me/${whatsappPhone.replace(/[^\d]/g, "")}`}
                label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="#" label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="#" label="Facebook">
                <Facebook className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="#" label="Twitter">
                <Twitter className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>

          {/* Explore */}
          <nav
            className="md:col-span-3"
            aria-label="Footer — explore"
          >
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/75 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="md:col-span-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Get in touch
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="group flex items-start gap-3 text-sm text-foreground/80 transition-colors hover:text-primary"
                >
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                  <span>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      Call us
                    </span>
                    {phone}
                  </span>
                </a>
              </li>
              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="group flex items-start gap-3 text-sm text-foreground/80 transition-colors hover:text-primary"
                  >
                    <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                    <span>
                      <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                        Email
                      </span>
                      {email}
                    </span>
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`https://wa.me/${whatsappPhone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 text-sm text-foreground/80 transition-colors hover:text-primary"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                  <span>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      WhatsApp
                    </span>
                    Order on WhatsApp
                  </span>
                </a>
              </li>
              <li>
                <span className="group flex items-start gap-3 text-sm text-foreground/80">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      Visit
                    </span>
                    {address}
                  </span>
                </span>
              </li>
              <li>
                <span className="group flex items-start gap-3 text-sm text-foreground/80">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      Hours
                    </span>
                    Open daily · 11:00 — 22:30
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 sm:flex-row sm:px-6">
          <p className="text-xs text-muted-foreground">
            © {year} {restaurantName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-primary">MajidOS</span> · Built
            by GTSS
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
    >
      {children}
    </a>
  );
}
