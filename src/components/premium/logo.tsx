import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo — single source of truth for the brand mark.
 *
 * Used in both the site header and the site footer (and the admin shell),
 * so the brand reads consistently everywhere. Falls back to a saffron
 * monogram tile when no logoUrl is provided — never a bare letter on
 * transparent background.
 *
 * Sizes are tokenized so the same component renders crisply at 32px in the
 * header and 40px in the footer.
 */
export function Logo({
  restaurantName,
  logoUrl,
  size = "md",
  href,
  showName = true,
  tagline,
  className,
}: {
  restaurantName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  href?: string;
  showName?: boolean;
  tagline?: string;
  className?: string;
}) {
  const dimensions = {
    sm: { box: "h-8 w-8", text: "text-sm", name: "text-sm", tag: "text-[10px]" },
    md: { box: "h-10 w-10", text: "text-base", name: "text-base sm:text-lg", tag: "text-[11px]" },
    lg: { box: "h-12 w-12", text: "text-lg", name: "text-lg sm:text-xl", tag: "text-xs" },
  }[size];

  const monogram = (restaurantName?.trim()?.charAt(0) || "M").toUpperCase();

  const mark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${restaurantName} logo`}
      className={cn(
        dimensions.box,
        "rounded-full object-cover ring-1 ring-border ring-offset-2 ring-offset-background",
      )}
    />
  ) : (
    <div
      className={cn(
        dimensions.box,
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground",
        "font-display font-bold shadow-sm ring-1 ring-primary/20",
        dimensions.text,
      )}
      aria-hidden
    >
      {monogram}
    </div>
  );

  const content = (
    <span className={cn("flex items-center gap-3", className)}>
      {mark}
      {showName && (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-display font-bold tracking-tight text-foreground",
              dimensions.name,
            )}
          >
            {restaurantName}
          </span>
          {tagline && (
            <span
              className={cn(
                "uppercase tracking-[0.12em] text-muted-foreground",
                dimensions.tag,
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex" aria-label={`${restaurantName} home`}>
        {content}
      </Link>
    );
  }
  return content;
}
