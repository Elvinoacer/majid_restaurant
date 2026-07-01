"use client";

import { cn } from "@/lib/utils";

export type FilterChip = {
  id: string;
  label: string;
  count?: number;
};

type MenuFilterChipsProps = {
  categories: FilterChip[];
  activeCategory: string | "all";
  onCategoryChange: (id: string | "all") => void;

  dietaryFilters: FilterChip[];
  activeDietary: string[];
  onDietaryToggle: (id: string) => void;
};

export function MenuFilterChips({
  categories,
  activeCategory,
  onCategoryChange,
  dietaryFilters,
  activeDietary,
  onDietaryToggle,
}: MenuFilterChipsProps) {
  return (
    <div className="space-y-2">
      <div
        className="scroll-thin flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Menu categories"
      >
        <ChipButton
          active={activeCategory === "all"}
          onClick={() => onCategoryChange("all")}
        >
          All
        </ChipButton>
        {categories.map((c) => (
          <ChipButton
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => onCategoryChange(c.id)}
          >
            {c.label}
            {typeof c.count === "number" && (
              <span className="ml-1 text-[11px] opacity-70">{c.count}</span>
            )}
          </ChipButton>
        ))}
      </div>

      {dietaryFilters.length > 0 && (
        <div
          className="scroll-thin flex flex-wrap gap-1.5"
          aria-label="Dietary filters"
        >
          {dietaryFilters.map((f) => {
            const active = activeDietary.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => onDietaryToggle(f.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-foreground/70 hover:border-accent/60",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground/80 hover:bg-accent/10 hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}
