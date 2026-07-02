import { cn } from "@/lib/utils";

/**
 * Consistent max-width container for every page body.
 *
 * Premium products align everything to one outer width — this wrapper
 * enforces that across customer + admin surfaces so pages never feel
 * ad-hoc. The `wide` variant is for dashboards / tables that benefit
 * from more horizontal room.
 */
export function Container({
  children,
  className,
  size = "default",
  as: Comp = "div",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
  as?: React.ElementType;
}) {
  return (
    <Comp
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        size === "default" && "max-w-6xl",
        size === "wide" && "max-w-7xl",
        size === "narrow" && "max-w-3xl",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
