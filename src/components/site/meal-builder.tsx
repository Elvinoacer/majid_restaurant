"use client";

/**
 * Meal Builder (PRD §5.23 — Intelligence Layer).
 *
 * Step flow: Base → Protein → Drink → Dessert, with a live-calculated total.
 * Each stage pulls from menu items the owner has tagged with the matching
 * `mealBuilderStage` value (see MenuItem.mealBuilderStage in the schema).
 *
 * Behaviour:
 *   - Stages are visited in order; a "Next" button is disabled until at
 *     least one item is selected in the current stage. (Stages are not
 *     strictly required — the user can skip with "Skip stage" — but the
 *     guidance pattern is: build a full meal.)
 *   - Multiple items per stage are allowed (e.g., 2x Mango Lassi in the
 *     drink stage). Quantity stepper per selected item.
 *   - Live total updates as the user picks.
 *   - "Add all to cart" sends every selected line to the cart store and
 *     routes the customer to /checkout.
 *   - Gated on `restaurant.comboBuilderEnabled` — the page that mounts this
 *     component 404s when the flag is off, so the component itself doesn't
 *     need a fallback.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wheat,
  Beef,
  CupSoda,
  IceCream,
  Check,
  ShoppingCart,
  Minus,
  Plus,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/store";
import { formatKsh } from "@/lib/whatsapp/order";
import type { MenuItemWithTags } from "@/lib/menu";
import { Container } from "@/components/premium/container";

// ─── Types ───────────────────────────────────────────────────────────────

export type MealBuilderStageId = "base" | "protein" | "drink" | "dessert";

type Stage = {
  id: MealBuilderStageId;
  label: string;
  instruction: string;
  icon: typeof Wheat;
};

const STAGES: Stage[] = [
  {
    id: "base",
    label: "Base",
    instruction: "Pick your rice or carb",
    icon: Wheat,
  },
  {
    id: "protein",
    label: "Protein",
    instruction: "Add your main",
    icon: Beef,
  },
  {
    id: "drink",
    label: "Drink",
    instruction: "Quench your thirst",
    icon: CupSoda,
  },
  {
    id: "dessert",
    label: "Dessert",
    instruction: "Finish on a sweet note",
    icon: IceCream,
  },
];

type MealBuilderProps = {
  slug: string;
  items: MenuItemWithTags[];
};

// Per-stage selected item with quantity.
type Selection = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  imageUrl?: string | null;
  quantity: number;
};

// ─── Component ───────────────────────────────────────────────────────────

export function MealBuilder({ slug, items: _items }: MealBuilderProps) {
  const router = useRouter();
  const addLine = useCart((s) => s.addLine);

  // Group items by stage.
  const itemsByStage = useMemo(() => {
    const map: Record<MealBuilderStageId, MenuItemWithTags[]> = {
      base: [],
      protein: [],
      drink: [],
      dessert: [],
    };
    for (const item of _items) {
      if (item.mealBuilderStage && item.isAvailable) {
        map[item.mealBuilderStage].push(item);
      }
    }
    return map;
  }, [_items]);

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [selections, setSelections] = useState<Record<MealBuilderStageId, Selection[]>>({
    base: [],
    protein: [],
    drink: [],
    dessert: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const currentStage = STAGES[currentStageIdx];
  const isLastStage = currentStageIdx === STAGES.length - 1;

  // Compute live total across all stages.
  const total = useMemo(() => {
    return STAGES.reduce((sum, stage) => {
      return (
        sum +
        selections[stage.id].reduce(
          (s, sel) => s + sel.unitPrice * sel.quantity,
          0,
        )
      );
    }, 0);
  }, [selections]);

  const totalItems = useMemo(() => {
    return STAGES.reduce(
      (sum, stage) => sum + selections[stage.id].length,
      0,
    );
  }, [selections]);

  const toggleItem = (stageId: MealBuilderStageId, item: MenuItemWithTags) => {
    setSelections((prev) => {
      const stageSelections = prev[stageId];
      const existing = stageSelections.find((s) => s.menuItemId === item.id);
      if (existing) {
        // Toggle off if already selected.
        return {
          ...prev,
          [stageId]: stageSelections.filter((s) => s.menuItemId !== item.id),
        };
      }
      return {
        ...prev,
        [stageId]: [
          ...stageSelections,
          {
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            imageUrl: item.imageUrl,
            quantity: 1,
          },
        ],
      };
    });
  };

  const setQty = (
    stageId: MealBuilderStageId,
    menuItemId: string,
    delta: number,
  ) => {
    setSelections((prev) => {
      const stageSelections = prev[stageId];
      return {
        ...prev,
        [stageId]: stageSelections.map((s) =>
          s.menuItemId === menuItemId
            ? { ...s, quantity: Math.max(1, s.quantity + delta) }
            : s,
        ),
      };
    });
  };

  const handleNext = () => {
    if (!isLastStage) {
      setCurrentStageIdx((i) => Math.min(i + 1, STAGES.length - 1));
      // Scroll to top of stage area for mobile UX.
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBack = () => {
    setCurrentStageIdx((i) => Math.max(i - 1, 0));
  };

  const handleAddAllToCart = () => {
    if (totalItems === 0) {
      toast.error("Pick at least one item first.");
      return;
    }
    setSubmitting(true);
    try {
      for (const stage of STAGES) {
        for (const sel of selections[stage.id]) {
          addLine(
            {
              menuItemId: sel.menuItemId,
              name: sel.name,
              unitPrice: sel.unitPrice,
              imageUrl: sel.imageUrl,
            },
            sel.quantity,
          );
        }
      }
      toast.success(`${totalItems} item${totalItems === 1 ? "" : "s"} added to cart`);
      router.push(`/${slug}/cart`);
    } finally {
      setSubmitting(false);
    }
  };

  const stageSelections = selections[currentStage.id];
  const stageItems = itemsByStage[currentStage.id];

  return (
    <Container size="wide" className="py-6 sm:py-10">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Combo builder
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Build your meal</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Four steps: Base, Protein, Drink, Dessert. Mix and match — we&apos;ll
          keep a running total.
        </p>
      </header>

      {/* Stepper */}
      <Stepper
        stages={STAGES}
        currentIdx={currentStageIdx}
        selections={selections}
        onJump={setCurrentStageIdx}
      />

      {/* Stage content */}
      <section className="mt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Step {currentStageIdx + 1}: {currentStage.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentStage.instruction}
            </p>
          </div>
          {stageItems.length === 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              No items configured for this stage
            </span>
          )}
        </div>

        {stageItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stageItems.map((item) => {
              const selected = stageSelections.find((s) => s.menuItemId === item.id);
              const isSelected = !!selected;
              return (
                <article
                  key={item.id}
                  onClick={() => toggleItem(currentStage.id, item)}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-2 rounded-xl border-2 bg-card p-3 transition-colors",
                    isSelected
                      ? "border-primary ring-1 ring-primary/20"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {/* Image + check overlay */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      KSh {formatKsh(item.price)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  {/* Quantity stepper — only shown when selected */}
                  {isSelected && (
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2">
                      <span className="text-xs text-muted-foreground">Qty</span>
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQty(currentStage.id, item.id, -1);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center text-foreground hover:bg-accent/10"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium">
                          {selected!.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQty(currentStage.id, item.id, 1);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center text-foreground hover:bg-accent/10"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            The owner hasn&apos;t tagged any items for this stage yet.{" "}
            <button
              onClick={handleNext}
              className="font-medium text-primary hover:underline"
            >
              Skip to next step
            </button>
          </div>
        )}
      </section>

      {/* Sticky summary bar — mobile-first per PRD */}
      <div className="sticky bottom-0 z-30 mt-6 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Your meal
              </p>
              <p className="font-display text-lg font-bold">
                KSh {formatKsh(total)}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {totalItems} item{totalItems === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentStageIdx > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            {!isLastStage ? (
              <Button size="sm" onClick={handleNext} className="gap-1">
                Next: {STAGES[currentStageIdx + 1].label}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleAddAllToCart}
                disabled={submitting || totalItems === 0}
                className="gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Add all to cart
              </Button>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}

// ─── Stepper sub-component ───────────────────────────────────────────────

function Stepper({
  stages,
  currentIdx,
  selections,
  onJump,
}: {
  stages: Stage[];
  currentIdx: number;
  selections: Record<MealBuilderStageId, Selection[]>;
  onJump: (idx: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-2 text-xs">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isReachable = idx <= currentIdx; // can't jump forward past current
        const count = selections[stage.id].length;
        return (
          <li key={stage.id} className="flex-1">
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onJump(idx)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                isCurrent && "bg-primary/10 text-primary",
                isDone && "text-foreground/70",
                !isReachable && "cursor-not-allowed text-muted-foreground/50",
                isReachable && !isCurrent && "hover:bg-accent/5",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  isCurrent && "bg-primary text-primary-foreground",
                  isDone && "bg-green-500 text-white",
                  !isCurrent && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span className="hidden flex-1 sm:block">
                <span className="flex items-center gap-1 font-medium">
                  <Icon className="h-3 w-3" />
                  {stage.label}
                </span>
                {count > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {count} item{count === 1 ? "" : "s"}
                  </span>
                )}
              </span>
              <span className="sm:hidden">{stage.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
