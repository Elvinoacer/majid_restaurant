import { cn } from "@/lib/utils";

/**
 * PremiumCard — the default elevated surface across the app.
 *
 * Wraps the shadcn Card with the elevation system + consistent hover
 * behavior. Use this for any card that should "feel above the page"
 * without floating. The `interactive` variant adds a hover lift + border
 * accent for clickable cards (menu items, quick links, etc.).
 */
export function PremiumCard({
  children,
  className,
  interactive,
  as: Comp = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  as?: React.ElementType;
}) {
  return (
    <Comp
      className={cn(
        "rounded-2xl border border-border bg-card elevation-1",
        interactive &&
          "transition-all duration-200 hover:elevation-2 hover:border-primary/30 hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
