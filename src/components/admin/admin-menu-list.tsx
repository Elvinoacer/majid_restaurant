"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Power, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatKsh } from "@/lib/whatsapp/order";
import {
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "@/lib/menu/actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isPopular: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isHalal: boolean;
  category: { id: string; name: string };
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  items: Item[];
};

export function AdminMenuList({
  slug,
  categories,
}: {
  slug: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const result = await toggleMenuItemAvailability(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.isAvailable ? "Marked available" : "Marked sold out");
      router.refresh();
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteMenuItem(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Item deleted");
      router.refresh();
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit items, toggle availability, manage categories.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${slug}/admin/menu/new`}>
            <Plus className="mr-1 h-4 w-4" />
            New item
          </Link>
        </Button>
      </header>

      {categories.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No categories. Create categories via the seed script or the API.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  {cat.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
                  </span>
                </h2>
              </div>
              {cat.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No items in this category.
                </p>
              ) : (
                <ul className="space-y-2">
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border bg-card p-3",
                        !item.isAvailable && "opacity-60",
                      )}
                    >
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.imageUrl && (
                           
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.isPopular && (
                            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                              Popular
                            </span>
                          )}
                          {!item.isAvailable && (
                            <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                              Sold out
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          KSh {formatKsh(item.price)} · {item.isVegetarian ? "Veg" : "Non-veg"}
                          {item.isSpicy ? " · Spicy" : ""}
                          {item.isHalal ? " · Halal" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => handleToggle(item.id)}
                          title={item.isAvailable ? "Mark sold out" : "Mark available"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/${slug}/admin/menu/${item.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => handleDelete(item.id, item.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {pending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-background">
          <Loader2 className="h-4 w-4 animate-spin" />
          Working…
        </div>
      )}
    </div>
  );
}
