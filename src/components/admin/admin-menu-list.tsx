"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Power, Plus, Trash2, FolderPlus, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatKsh } from "@/lib/whatsapp/order";
import {
  deleteMenuItem,
  toggleMenuItemAvailability,
  upsertCategory,
  deleteCategory,
} from "@/lib/menu/actions";
import { PageHeader } from "@/components/premium/page-header";
import { SearchInput } from "@/components/premium/search-input";
import { EmptyState } from "@/components/premium/empty-state";

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
  const [showCategories, setShowCategories] = useState(false);
  const [query, setQuery] = useState("");

  // Filter categories+items by search query (name + description).
  const filteredCategories = query.trim()
    ? categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (it) =>
              it.name.toLowerCase().includes(query.toLowerCase()) ||
              (it.description?.toLowerCase().includes(query.toLowerCase()) ?? false),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : categories;

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
      <PageHeader
        title="Menu"
        subtitle="Edit items, toggle availability, manage categories."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={showCategories} onOpenChange={setShowCategories}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1.5">
                  <FolderPlus className="h-4 w-4" />
                  Categories
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Manage categories</DialogTitle>
                </DialogHeader>
                <CategoriesManager categories={categories} onDone={() => setShowCategories(false)} />
              </DialogContent>
            </Dialog>
            <Button asChild>
              <Link href={`/${slug}/admin/menu/new`}>
                <Plus className="mr-1 h-4 w-4" />
                New item
              </Link>
            </Button>
          </div>
        }
      />

      {categories.length > 0 && (
        <div className="mb-5">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search menu items by name or description…"
            ariaLabel="Search menu items"
          />
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-7 w-7" />}
          title="No categories yet"
          description="Click Categories above to create your first one, then add menu items to it."
        />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-7 w-7" />}
          title="No matching items"
          description="Try a different search term."
        />
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {cat.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
                  </span>
                  {!cat.isActive && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      Hidden
                    </span>
                  )}
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
                            <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
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

/**
 * Inline categories manager — add, rename, reorder, hide, delete categories.
 * Lives inside a Dialog so the menu list page doesn't have to navigate away.
 */
function CategoriesManager({
  categories,
  onDone,
}: {
  categories: Category[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [list, setList] = useState(categories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      const sortOrder = list.length > 0 ? Math.max(...list.map((c) => c.sortOrder)) + 1 : 0;
      const res = await upsertCategory({ name: newName.trim(), sortOrder, isActive: true });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Category created");
      setNewName("");
      onDone();
      router.refresh();
    });
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    const cat = list.find((c) => c.id === id);
    if (!cat) return;
    startTransition(async () => {
      const res = await upsertCategory({ id, name: editName.trim(), sortOrder: cat.sortOrder, isActive: cat.isActive });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Category renamed");
      setEditingId(null);
      onDone();
      router.refresh();
    });
  };

  const handleToggleActive = (cat: Category) => {
    startTransition(async () => {
      const res = await upsertCategory({ id: cat.id, name: cat.name, sortOrder: cat.sortOrder, isActive: !cat.isActive });
      if (!res.ok) { toast.error(res.error); return; }
      setList((prev) => prev.map((c) => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
      toast.success(cat.isActive ? "Category hidden from menu" : "Category visible on menu");
      router.refresh();
    });
  };

  const handleMove = (cat: Category, direction: -1 | 1) => {
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        upsertCategory({ id: cat.id, name: cat.name, sortOrder: swap.sortOrder, isActive: cat.isActive }),
        upsertCategory({ id: swap.id, name: swap.name, sortOrder: cat.sortOrder, isActive: swap.isActive }),
      ]);
      if (!r1.ok) { toast.error(r1.error); return; }
      if (!r2.ok) { toast.error(r2.error); return; }
      setList((prev) => prev.map((c) => {
        if (c.id === cat.id) return { ...c, sortOrder: swap.sortOrder };
        if (c.id === swap.id) return { ...c, sortOrder: cat.sortOrder };
        return c;
      }));
      toast.success("Category order updated");
      router.refresh();
    });
  };

  const handleDelete = (cat: Category) => {
    if (cat.items.length > 0) {
      toast.error(`Cannot delete — ${cat.items.length} items still in this category. Move them first.`);
      return;
    }
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCategory(cat.id);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Category deleted");
      setList((prev) => prev.filter((c) => c.id !== cat.id));
      router.refresh();
    });
  };

  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      {/* Add new */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          placeholder="New category name (e.g. Drinks)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={60}
        />
        <Button type="submit" disabled={pending || !newName.trim()} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      {/* Existing categories */}
      <ul className="space-y-2">
        {sorted.length === 0 ? (
          <li className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No categories yet. Add one above.
          </li>
        ) : (
          sorted.map((cat, i) => (
            <li
              key={cat.id}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border bg-card p-2",
                !cat.isActive && "opacity-60",
              )}
            >
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={pending || i === 0}
                  onClick={() => handleMove(cat, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={pending || i === sorted.length - 1}
                  onClick={() => handleMove(cat, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                {editingId === cat.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(cat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleRename(cat.id); }
                      if (e.key === "Escape") { setEditingId(null); }
                    }}
                    autoFocus
                    maxLength={60}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    className="block w-full text-left text-sm font-medium hover:underline"
                  >
                    {cat.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
                    </span>
                  </button>
                )}
              </div>

              <Switch
                checked={cat.isActive}
                onCheckedChange={() => handleToggleActive(cat)}
                disabled={pending}
                aria-label={cat.isActive ? "Hide from menu" : "Show on menu"}
              />

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => handleDelete(cat)}
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))
        )}
      </ul>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Done</Button>
        </DialogClose>
      </DialogFooter>
    </div>
  );
}
